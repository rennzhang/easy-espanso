import Sortable from 'sortablejs';
import type { Directive, DirectiveBinding } from 'vue';

// 类型定义，用于指令的 value 和 modifiers
interface SortableOptionsExtended extends Sortable.Options {
  // 自定义选项，用于传递给指令的额外配置
  modelValue?: any[]; // 如果需要通过v-model更新数据
  onUpdate?: (event: Sortable.SortableEvent) => void; // 拖拽结束回调
  onMove?: (event: Sortable.MoveEvent, originalEvent: Event) => boolean | void | -1 | 1; // 拖拽过程中的回调
  fallbackClone?: (el: HTMLElement) => HTMLElement; // 自定义克隆函数
}

// 自定义克隆函数，确保克隆元素总是折叠的
const customClone = function(originalElement: HTMLElement): HTMLElement {
  // 创建原始元素的克隆
  const cloneElement = originalElement.cloneNode(true) as HTMLElement;

  // 将克隆元素添加特殊类，标记为拖拽中
  cloneElement.classList.add('being-dragged');

  // 立即隐藏所有子容器
  const childContainers = cloneElement.querySelectorAll('.children');
  childContainers.forEach(container => {
    (container as HTMLElement).style.display = 'none';
  });

  // 修改展开/折叠图标状态
  const chevronDownIcons = cloneElement.querySelectorAll('.ChevronDownIcon');
  const chevronRightIcons = cloneElement.querySelectorAll('.ChevronRightIcon');

  // 隐藏所有展开图标
  chevronDownIcons.forEach(icon => {
    (icon as HTMLElement).style.display = 'none';
  });

  // 显示所有折叠图标
  chevronRightIcons.forEach(icon => {
    (icon as HTMLElement).style.display = 'inline-block';
  });

  console.log('[Custom Clone] Created clone with hidden children containers');
  return cloneElement;
};

// 添加自定义选项，强制使用备用的拖拽模式和克隆函数
const sortableDirective: Directive<HTMLElement, SortableOptionsExtended> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<SortableOptionsExtended>) {
    const options = binding.value || {};

    const defaultOptions: SortableOptionsExtended = {
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      delay: 50,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      forceFallback: true, // 强制使用备用模式，这样可以完全控制克隆元素
      fallbackClass: 'sortable-fallback',
      fallbackOnBody: true,
      fallbackTolerance: 5,

      // 使用自定义克隆函数
      setData: function(dataTransfer, dragEl) {
        // 可以在这里设置拖拽数据
        dataTransfer.setData('text', dragEl.textContent || '');
      },

      // 自定义克隆函数
      fallbackClone: customClone,

      // 拖拽开始
      onStart: (evt: Sortable.SortableEvent) => {
        console.log('[Sortable onStart]', evt);

        const draggedEl = evt.item;
        const nodeType = draggedEl.dataset.nodeType;

        // 只允许match和group节点拖拽，禁止文件夹和文件的拖拽
        if (nodeType !== 'match' && nodeType !== 'group') {
          console.log('[Sortable onStart] 禁止拖拽：只允许match和group节点拖拽');
          // 取消拖拽
          evt.preventDefault?.();
          evt.stopPropagation?.();

          // 如果有Sortable实例，取消拖拽
          if (el._sortableInstance) {
            el._sortableInstance.option('disabled', true);
            setTimeout(() => {
              if (el._sortableInstance) {
                el._sortableInstance.option('disabled', false);
              }
            }, 100);
          }

          return false;
        }

        document.body.classList.add('dragging-active');

        // 直接折叠被拖拽节点的所有子节点容器
        if (nodeType === 'group') {
          // 找到并触发chevron点击
          try {
            const chevron = draggedEl.querySelector('.ChevronDownIcon');
            if (chevron) {
              console.log('[Sortable onStart] Found chevron, clicking it');
              chevron.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              }));
            } else {
              console.log('[Sortable onStart] No chevron down icon found');
            }
          } catch (e) {
            console.error('[Sortable onStart] Error clicking chevron:', e);
          }

          // 无论点击是否成功，都强制隐藏children容器
          try {
            const childrenContainer = draggedEl.querySelector('.children');
            if (childrenContainer) {
              console.log('[Sortable onStart] Found children container, hiding it');
              (childrenContainer as HTMLElement).style.display = 'none';
            } else {
              console.log('[Sortable onStart] No children container found');
            }

            // 给拖拽元素添加类，支持CSS选择器控制其子元素
            draggedEl.classList.add('being-dragged');
          } catch (e) {
            console.error('[Sortable onStart] Error hiding children container:', e);
          }
        }

        // 调用用户自定义的onStart
        if (typeof options.onStart === 'function') {
          options.onStart(evt);
        }
      },

      // 拖拽结束时清理
      onEnd: (evt: Sortable.SortableEvent) => {
        console.log('[Sortable onEnd]', evt);
        document.body.classList.remove('dragging-active');

        const draggedEl = evt.item;
        draggedEl.classList.remove('being-dragged');

        // 移除所有指示线（确保在拖拽结束时移除）
        setTimeout(() => {
          document.querySelectorAll('.insert-indicator').forEach(el => {
            console.log('移除指示线:', el);
            el.remove();
          });
        }, 0);

        // 检查是否在安全区域内结束拖拽
        const targetContainer = evt.to;
        const isInSafeZone = targetContainer.classList.contains('drop-zone') ||
                             !!targetContainer.closest('.drop-zone');

        // 如果不在安全区域内，显示取消拖拽的视觉反馈
        if (!isInSafeZone) {
          console.log('[Sortable onEnd] 拖拽取消：不在安全区域内');

          // 添加取消动画类
          draggedEl.classList.add('drag-cancelled');

          // 动画结束后移除类
          setTimeout(() => {
            draggedEl.classList.remove('drag-cancelled');
          }, 500);

          // 如果拖拽被取消，将元素移回原位置
          if (evt.from !== evt.to && typeof evt.oldIndex === 'number') {
            // 如果是跨容器拖拽，需要手动将元素移回原容器
            const oldIndex = evt.oldIndex;
            const fromChildren = Array.from(evt.from.children);

            if (oldIndex >= 0 && oldIndex < fromChildren.length) {
              evt.from.insertBefore(draggedEl, fromChildren[oldIndex]);
            } else {
              // 如果原位置不存在，添加到末尾
              evt.from.appendChild(draggedEl);
            }
          } else if (typeof evt.oldIndex === 'number') {
            // 如果是同一容器内拖拽，只需要恢复原顺序
            const children = Array.from(evt.from.children);
            const currentIndex = children.indexOf(draggedEl);
            const oldIndex = evt.oldIndex;

            if (currentIndex !== oldIndex && oldIndex >= 0 && oldIndex < children.length) {
              if (currentIndex < oldIndex && oldIndex + 1 < children.length) {
                evt.from.insertBefore(draggedEl, children[oldIndex + 1]);
              } else {
                evt.from.insertBefore(draggedEl, children[oldIndex]);
              }
            }
          }
        }

        // 调用用户自定义的onEnd
        if (typeof options.onEnd === 'function') {
          // 只有在安全区域内结束拖拽时才调用用户自定义的onEnd
          if (isInSafeZone) {
            options.onEnd(evt);
          }
        }
      },

      // 检查移动有效性
      onMove: (evt: Sortable.MoveEvent, originalEvent: Event) => {
        const draggedEl = evt.dragged;
        const targetEl = evt.related;

        const draggedType = draggedEl.dataset.nodeType;

        // 获取目标容器的父节点类型
        const targetContainer = targetEl.closest('.drop-zone') as HTMLElement;
        const targetContainerType = targetContainer?.dataset?.containerType || '';

        // 获取拖拽项的类型和目标容器类型
        console.log('拖拽检查:', {
          draggedType,
          targetContainerType,
          draggedEl: draggedEl.dataset,
          targetEl: targetEl.dataset,
          targetContainer: targetContainer?.dataset
        });

        // 规则0：只允许match和group节点拖拽，禁止文件夹和文件的拖拽
        if (draggedType !== 'match' && draggedType !== 'group') {
          console.log('禁止拖拽：只允许match和group节点拖拽');
          // 添加视觉提示，表明这不是有效的放置区域
          targetEl.classList.add('invalid-drop-target');

          // 使用setTimeout移除类，避免视觉效果持续太久
          setTimeout(() => {
            targetEl.classList.remove('invalid-drop-target');
          }, 300);

          // 移除所有指示线
          document.querySelectorAll('.insert-indicator').forEach(el => el.remove());

          return false; // 禁止此移动
        }

        // 规则1：match和group节点不能拖入folder节点
        if ((draggedType === 'match' || draggedType === 'group') && targetContainerType === 'folder') {
          console.log('禁止拖拽：match/group不能拖入folder');
          // 添加视觉提示，表明这不是有效的放置区域
          targetEl.classList.add('invalid-drop-target');

          // 使用setTimeout移除类，避免视觉效果持续太久
          setTimeout(() => {
            targetEl.classList.remove('invalid-drop-target');
          }, 300);

          // 移除所有指示线
          document.querySelectorAll('.insert-indicator').forEach(el => el.remove());

          return false; // 禁止此移动
        }

        // 规则2：match和group节点只能拖入file节点或group节点
        if ((draggedType === 'match' || draggedType === 'group') &&
            targetContainerType !== 'file' && targetContainerType !== 'group' && targetContainerType !== 'root') {
          console.log('禁止拖拽：match/group只能拖入file/group/root');
          // 添加视觉提示，表明这不是有效的放置区域
          targetEl.classList.add('invalid-drop-target');

          // 使用setTimeout移除类，避免视觉效果持续太久
          setTimeout(() => {
            targetEl.classList.remove('invalid-drop-target');
          }, 300);

          // 移除所有指示线
          document.querySelectorAll('.insert-indicator').forEach(el => el.remove());

          return false; // 禁止此移动
        }

        // 安全区域检测：检查目标元素是否在安全拖拽区域内
        // 安全区域是指有 .drop-zone 类的元素或其子元素
        const isInSafeZone = targetEl.classList.contains('drop-zone') ||
                             !!targetEl.closest('.drop-zone');

        // 如果不在安全区域内，禁止移动
        if (!isInSafeZone) {
          // 添加视觉提示，表明这不是有效的放置区域
          targetEl.classList.add('invalid-drop-target');

          // 使用setTimeout移除类，避免视觉效果持续太久
          setTimeout(() => {
            targetEl.classList.remove('invalid-drop-target');
          }, 300);

          return false; // 禁止此移动
        } else {
          // 在安全区域内，添加视觉提示
          targetEl.classList.add('valid-drop-target');

          // 添加蓝色指示线，显示可以插入的位置
          const insertLine = document.createElement('div');
          insertLine.className = 'insert-indicator';

          // 计算指示线位置（在目标元素上方或下方）
          const rect = targetEl.getBoundingClientRect();
          const mouseY = (originalEvent as MouseEvent).clientY;
          const isBeforeTarget = mouseY < rect.top + rect.height / 2;

          // 移除之前的指示线
          document.querySelectorAll('.insert-indicator').forEach(el => el.remove());

          if (isBeforeTarget) {
            // 在目标元素上方插入
            insertLine.style.top = `${rect.top - 2}px`;
          } else {
            // 在目标元素下方插入
            insertLine.style.top = `${rect.bottom}px`;
          }

          // 确保指示线宽度足够，并且左侧对齐
          insertLine.style.left = `${rect.left}px`;
          insertLine.style.width = `${rect.width}px`;

          // 添加一些内联样式，确保指示线可见
          insertLine.style.backgroundColor = '#3b82f6'; // 蓝色
          insertLine.style.height = '4px'; // 确保高度足够
          insertLine.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.8)';
          insertLine.style.pointerEvents = 'none'; // 确保不会干扰鼠标事件
          insertLine.style.zIndex = '2000'; // 确保在最上层
          insertLine.style.position = 'fixed'; // 确保位置固定
          insertLine.style.borderRadius = '2px'; // 添加圆角
          insertLine.style.opacity = '1'; // 确保完全不透明

          // 添加新的指示线
          document.body.appendChild(insertLine);

          // 打印日志，确认指示线已创建
          console.log('创建指示线:', {
            top: insertLine.style.top,
            left: insertLine.style.left,
            width: insertLine.style.width,
            height: insertLine.style.height
          });

          // 使用setTimeout移除类和指示线
          setTimeout(() => {
            targetEl.classList.remove('valid-drop-target');
          }, 300);
        }

        // 将自定义逻辑传递给用户提供的onMove
        if (typeof options.onMove === 'function') {
          return options.onMove(evt, originalEvent);
        }

        return true; // 默认允许移动
      }
    };

    // 合并默认选项和用户提供的选项
    const sortableOptions = { ...defaultOptions, ...options };

    // 创建Sortable实例
    const sortableInstance = Sortable.create(el, sortableOptions);

    // 保存实例以便稍后卸载
    el._sortableInstance = sortableInstance;
  },

  unmounted(el: HTMLElement) {
    // 清理 Sortable 实例
    if (el._sortableInstance) {
      el._sortableInstance.destroy();
      delete el._sortableInstance;
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding<SortableOptionsExtended>) {
    // 当绑定值变化时更新选项
    const oldOptions = el._sortableInstance?.options || {};
    const newOptions = binding.value || {};

    // 检查并更新选项
    const optionsChanged = JSON.stringify(oldOptions) !== JSON.stringify(newOptions);

    if (optionsChanged && el._sortableInstance) {
      // 销毁旧实例
      el._sortableInstance.destroy();

      // 创建新实例
      const defaultOptions: SortableOptionsExtended = {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        forceFallback: true,
        fallbackClone: customClone,
      };

      const sortableOptions = { ...defaultOptions, ...newOptions };
      el._sortableInstance = Sortable.create(el, sortableOptions);
    }
  }
};

// 声明给 TypeScript 的类型扩展
// 允许在 HTMLElement 上添加 _sortableInstance 属性
declare global {
  interface HTMLElement {
    _sortableInstance?: Sortable;
  }
}

export default sortableDirective;