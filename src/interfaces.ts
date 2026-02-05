/**
 * settings = {
		iconPrefix: "my-",
		customFolderPath: "",
		generatePrefixFromPath: false,
		slugify: {
			replacement: "-", //replace space with a characters
			remove: undefined, //remove characters that match regex
			lower: false, //convert to lowercase
			trim: true, //trim leading and trailing replacement chars
			strict: false, //strip special characters except replacement
		},
 */
export interface MySvgsSettings {
	iconPrefix: string;
	customFolderPath: string;
	/**
	 * When true, enable slugify + prefix generation replace the general prefix
	 * @example Boxicons/MySvg.svg => Bo-MySvg.svg
	 * @example remix-icons/alerts/MySvg.svg => Ri-alerts-MySvg.svg
	 * @example font-awesome-regular/MySvg.svg => Fab-MySvg.svg
	 * It will keep by default the first two letters of the last folder as prefix, but if the folder is like word1-word2-word3... it will keep first letter of each word as prefix (example: font-awesome-regular/MySvg.svg => Far-MySvg.svg). It is usable ONLY for subfolders, icons on a one folder level will be loaded with the global prefix
	 */
	generatePrefixFromPath: boolean;
	slugify: {
		replacement: string;
		remove: string | undefined;
		lower: boolean;
		trim: boolean;
		strict: boolean;
	};
}

export const DEFAULT_SETTINGS: MySvgsSettings = {
	iconPrefix: "my-",
	customFolderPath: "",
	generatePrefixFromPath: false,
	slugify: {
		replacement: "-",
		remove: undefined,
		lower: false,
		trim: true,
		strict: false,
	},
};
