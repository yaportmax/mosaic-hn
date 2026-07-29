export interface StoryModuleAvailability {
  comments: boolean;
  discovery: boolean;
  library: boolean;
  archive: boolean;
}

export interface StoryCapabilityPlan {
  loadComments: boolean;
  loadRelated: boolean;
  loadTimeline: boolean;
  loadLibrary: boolean;
  loadSavedComments: boolean;
}

export function createStoryCapabilityPlan(modules: StoryModuleAvailability): StoryCapabilityPlan {
  return {
    loadComments: modules.comments,
    loadRelated: modules.discovery,
    loadTimeline: modules.archive,
    loadLibrary: modules.library,
    loadSavedComments: modules.comments && modules.library
  };
}
