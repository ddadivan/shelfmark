/**
 * Value of the folder field while it holds a folder named in the dialog but not created yet
 * (#454); never sent to the API (`AddLinkNewFolderService.resolve` swaps it for the real id).
 */
export const NEW_FOLDER_OPTION_ID = 'add-link:new-folder';
