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
  // 检查ID的前缀
  const matchPrefix = 'match-';
  const filePrefix = 'file-';
  const folderPrefix = 'folder-';

  let prefix = '';
  let contentToEncode = '';

  if (nodeId.startsWith(matchPrefix)) {
    prefix = matchPrefix;
    contentToEncode = nodeId.substring(prefix.length);
  } else if (nodeId.startsWith(filePrefix)) {
    prefix = filePrefix;
    contentToEncode = nodeId.substring(prefix.length);
  } else if (nodeId.startsWith(folderPrefix)) {
    prefix = folderPrefix;
    contentToEncode = nodeId.substring(prefix.length);
  }

  // 如果有需要编码的内容
  if (prefix && contentToEncode) {
    try {
        // 对内容部分进行Base64编码
        const encodedContent = btoa(encodeURIComponent(contentToEncode));
        return `${prefix}${encodedContent}`; // 保持前缀，编码内容
    } catch (e) {
        console.error(`编码节点内容失败 (${nodeId}):`, e);
        return nodeId; // 编码失败则返回原始ID
    }
  }

  // 如果不是需要编码的类型（或者格式不对），直接返回原始ID
  return nodeId;
};

/**
 * 解码节点ID
 *
 * @param encodedId 编码后的节点ID
 * @returns 原始节点ID
 */
export const decodeNodeId = (encodedId: string): string => {
  const matchPrefix = 'match-';
  const filePrefix = 'file-';
  const folderPrefix = 'folder-';

  let prefix = '';
  let contentToDecode = '';

  if (encodedId.startsWith(matchPrefix)) {
    prefix = matchPrefix;
    contentToDecode = encodedId.substring(prefix.length);
  } else if (encodedId.startsWith(filePrefix)) {
    prefix = filePrefix;
    contentToDecode = encodedId.substring(prefix.length);
  } else if (encodedId.startsWith(folderPrefix)) {
    prefix = folderPrefix;
    contentToDecode = encodedId.substring(prefix.length);
  }

  if (prefix && contentToDecode) {
    try {
      // 尝试解码Base64和URIComponent
      const decodedContent = decodeURIComponent(atob(contentToDecode));
      return `${prefix}${decodedContent}`;
    } catch (e) {
      // 如果解码失败，可能意味着它本身就是未编码的ID（例如旧数据或错误）
      // console.warn(`解码节点内容失败 (${encodedId})，可能不是编码格式:`, e);
      return encodedId; // 返回原始编码ID
    }
  }

  // 如果不是需要解码的类型，直接返回原始ID
  return encodedId;
};

/**
 * 检查节点ID是否已经编码
 *
 * @param nodeId 节点ID
 * @returns 如果节点ID已经编码，返回true
 */
export const isNodeIdEncoded = (nodeId: string): boolean => {
  const matchPrefix = 'match-';
  const filePrefix = 'file-';
  const folderPrefix = 'folder-';
  let contentPart = '';

  if (nodeId.startsWith(matchPrefix)) {
    contentPart = nodeId.substring(matchPrefix.length);
  } else if (nodeId.startsWith(filePrefix)) {
    contentPart = nodeId.substring(filePrefix.length);
  } else if (nodeId.startsWith(folderPrefix)) {
    contentPart = nodeId.substring(folderPrefix.length);
  } else {
      return false; // 没有有效前缀，肯定未编码
  }

  // 尝试解码，如果成功则说明是已编码的
  try {
    // 检查是否是有效的Base64
    atob(contentPart);
    // 检查是否能被URI解码
    decodeURIComponent(atob(contentPart));
    return true;
  } catch {
    return false;
  }
};


