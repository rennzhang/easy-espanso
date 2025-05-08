/**
 * 节点ID编码工具
 *
 * 提供将节点ID编码为可持久化的格式，以及将编码后的ID解码回原始格式的功能。
 * 主要用于解决基于路径的节点ID在会话之间可能变化的问题。
 */

/**
 * 编码节点ID
 *
 * 对于文件和文件夹节点，ID格式为"type-path"，我们需要对path部分进行编码
 * 对于match节点，ID已经是UUID格式，不需要特殊处理
 *
 * @param nodeId 原始节点ID
 * @returns 编码后的节点ID
 */
export const encodeNodeId = (nodeId: string): string => {
  // 检查是否是文件或文件夹节点
  if (nodeId.startsWith('file-') || nodeId.startsWith('folder-')) {
    const [type, ...pathParts] = nodeId.split('-');
    const path = pathParts.join('-'); // 重新连接路径部分（路径中可能包含连字符）

    // 对路径部分进行Base64编码
    const encodedPath = btoa(encodeURIComponent(path));
    return `${type}-${encodedPath}`;
  }

  // 对于match节点，直接返回原始ID
  return nodeId;
};

/**
 * 解码节点ID
 *
 * @param encodedId 编码后的节点ID
 * @returns 原始节点ID
 */
export const decodeNodeId = (encodedId: string): string => {
  try {
    // 检查是否是编码后的文件或文件夹节点ID
    if (encodedId.startsWith('file-') || encodedId.startsWith('folder-')) {
      const [type, ...encodedPathParts] = encodedId.split('-');
      const encodedPath = encodedPathParts.join('-'); // 重新连接编码部分

      // 尝试解码
      try {
        const path = decodeURIComponent(atob(encodedPath));
        return `${type}-${path}`;
      } catch (e) {
        // 如果解码失败，可能是未编码的ID，直接返回原始ID
        return encodedId;
      }
    }

    // 对于match节点，直接返回原始ID
    return encodedId;
  } catch (e) {
    console.error('解码节点ID失败:', encodedId, e);
    // 解码失败时返回原始ID
    return encodedId;
  }
};

/**
 * 检查节点ID是否已经编码
 *
 * @param nodeId 节点ID
 * @returns 如果节点ID已经编码，返回true
 */
export const isNodeIdEncoded = (nodeId: string): boolean => {
  // 对于文件和文件夹节点
  if (nodeId.startsWith('file-') || nodeId.startsWith('folder-')) {
    const [_type, ...pathParts] = nodeId.split('-');
    const path = pathParts.join('-');

    // 尝试解码，如果成功则说明是已编码的
    try {
      atob(path);
      // 进一步验证解码后的内容是否有效
      try {
        decodeURIComponent(atob(path));
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  // 对于match节点，始终返回false（不需要编码）
  return false;
};


