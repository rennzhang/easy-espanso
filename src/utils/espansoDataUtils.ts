import { v4 as uuidv4 } from 'uuid';
import { Match, Group, EspansoConfig } from '@/types/espanso';

// Re-exporting types needed internally or by consumers of these utils
export type { Match, Group, EspansoConfig };

// --- ID Generation --- //
export const generateId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
};

// Keep track of order during processing if needed globally
// Consider if this state truly belongs here or should be managed by the caller (e.g., the store)
// For now, keeping it as an internal detail of processing.
let globalGuiOrderCounter = 0;
export const resetGuiOrderCounter = () => { globalGuiOrderCounter = 0; };

// --- Data Processing --- //
export const processMatch = (match: any, filePath?: string): Match => {
    globalGuiOrderCounter++; // Increment counter
    // console.log('[processMatch] Processing match with trigger:', match.trigger, `guiOrder: ${globalGuiOrderCounter}`);
    const baseMatch: Match = {
      id: match.id || generateId('match'),
      type: 'match',
      filePath: filePath || match.filePath || '',
      guiOrder: globalGuiOrderCounter, // Assign current order
      trigger: undefined,
      triggers: undefined,
      replace: match.replace || '',
      label: match.label,
      description: match.description,
      word: match.word,
      left_word: match.left_word,
      right_word: match.right_word,
      propagate_case: match.propagate_case,
      uppercase_style: match.uppercase_style,
      force_mode: match.force_mode,
      apps: match.apps,
      exclude_apps: match.exclude_apps,
      vars: match.vars,
      search_terms: match.search_terms,
      priority: match.priority,
      hotkey: match.hotkey,
      image_path: match.image_path,
      markdown: match.markdown,
      html: match.html,
      content: match.content,
    };

    // Handle multiline trigger strings (YAML blocks)
    if (match.trigger && typeof match.trigger === 'string' &&
       (match.trigger.includes('\n') || match.trigger.includes(','))) {
      const triggerItems = match.trigger
        .split(/[\n,]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t !== '');

      if (triggerItems.length > 1) {
        baseMatch.triggers = triggerItems;
        delete baseMatch.trigger;
      } else {
        baseMatch.trigger = triggerItems[0] || match.trigger;
        delete baseMatch.triggers;
      }
    // Handle standard trigger/triggers fields
    } else if (Array.isArray(match.triggers) && match.triggers.length > 0) {
      baseMatch.triggers = match.triggers;
      delete baseMatch.trigger;
    } else if (match.trigger) {
      baseMatch.trigger = match.trigger;
      delete baseMatch.triggers;
    } else {
      // Default or error handling? For now, leave both undefined.
    }
    return baseMatch;
};

export const processGroup = (group: any, filePath?: string): Group => {
    globalGuiOrderCounter++; // Increment counter for group
    const processedGroup: Group = {
      id: group.id || generateId('group'),
      type: 'group',
      name: group.name || '未命名分组',
      matches: [],
      groups: [],
      filePath: filePath || group.filePath || '',
      guiOrder: globalGuiOrderCounter,
      ...(group as Omit<Group, 'id' | 'type' | 'name' | 'matches' | 'groups' | 'filePath' | 'guiOrder'>)
    };
    // Recursively process matches and nested groups, passing the filePath down
    processedGroup.matches = Array.isArray(group.matches)
      ? group.matches.map((match: any) => processMatch(match, filePath))
      : [];
    processedGroup.groups = Array.isArray(group.groups)
      ? group.groups.map((nestedGroup: any) => processGroup(nestedGroup, filePath))
      : [];
    return processedGroup;
};

// --- Data Finding/Updating --- //

// Helper for recursive search within Group objects
export const findItemByIdRecursive = (item: Match | Group, targetId: string): Match | Group | null => {
    if (item.id === targetId) return item;
    if (item.type === 'group') {
       if (item.matches) {
          const foundMatch = item.matches.find(m => m.id === targetId);
          if (foundMatch) return foundMatch;
       }
       if (item.groups) {
          for (const subGroup of item.groups) {
             const found = findItemByIdRecursive(subGroup, targetId);
             if (found) return found;
          }
       }
    }
    return null;
};

export const findItemInGroup = (group: Group, id: string): Match | Group | null => {
    return findItemByIdRecursive(group, id);
};

// Finds item in flat lists (top-level matches or recursively within top-level groups)
export const findItemInEspansoConfig = (config: EspansoConfig | null, id: string): Match | Group | null => {
    if (!config) return null;
     const directMatch = config.matches.find((m: Match) => m.id === id);
     if (directMatch) return directMatch;
     for (const group of config.groups) {
        const found = findItemByIdRecursive(group, id);
        if (found) return found;
     }
     return null;
};

// Helper to update an item within a Group structure recursively
export const findAndUpdateInGroup = (group: Group, updatedItem: Match | Group): boolean => {
    if (updatedItem.type === 'match' && group.matches) {
        const index = group.matches.findIndex(m => m.id === updatedItem.id);
        if (index !== -1) {
            // Ensure type safety if necessary, or rely on caller
            group.matches[index] = updatedItem as Match;
            return true;
        }
    }
    if (group.groups) {
        for (let i = 0; i < group.groups.length; i++) {
            const currentGroup = group.groups[i];
             if (updatedItem.type === 'group' && currentGroup.id === updatedItem.id) {
                 // Ensure type safety
                 group.groups[i] = updatedItem as Group;
                 return true;
             }
             // Recurse into subgroups
             if (findAndUpdateInGroup(currentGroup, updatedItem)) {
                 return true;
             }
        }
    }
    return false;
}; 