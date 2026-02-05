import { addIcon, Notice, normalizePath, Plugin } from "obsidian";
import slugify from "slugify";
import { DEFAULT_SETTINGS, type MySvgsSettings } from "./interfaces";
import { SvgIconsSettingTab } from "./settings";
import "uniformize";
export default class MySvgsPlugin extends Plugin {
	settings!: MySvgsSettings;
	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SvgIconsSettingTab(this.app, this));

		await this.loadPluginIcons();
	}

	getIconFolderPath() {
		let iconsPath = normalizePath(`${this.manifest.dir}/icons`);
		if (this.settings.customFolderPath.trim() !== "") {
			const customPath = this.settings.customFolderPath.trim();
			iconsPath = normalizePath(customPath);
		}
		return iconsPath;
	}

	getFolderPrefix(filePath: string, baseName: string) {
		const iconPath = this.getIconFolderPath();
		const pathParts = filePath
			.replace(iconPath, "")
			.replace(`${baseName}.svg`, "")
			.split("/")
			.filter((x) => x.trim().length > 0);
		//get the last one
		const lastPart = pathParts[pathParts.length - 1];
		if (!lastPart) return this.settings.iconPrefix;
		if (lastPart.includes("-")) {
			return lastPart
				.split("-")
				.map((word) => word.charAt(0))
				.join("")
				.toTitle();
		}
		console.log(lastPart.substring(0, 2).toTitle());
		return lastPart.substring(0, 2).toTitle();
	}

	/**
	 * Pattern is in the form of `/str/flags`
	 * @param pattern {string} The pattern to convert to a RegExp
	 * @returns {RegExp} The resulting RegExp object
	 * @example
	 * transformToRegex("/^icon-/") => /^icon-/
	 * transformToRegex("/icon$/i") => /icon$/i
	 * transformToRegex("/^icon-(home|alert)$/") => /^icon-(home|alert)$/
	 */
	private transformToRegex(pattern: string): RegExp {
		const regexParts = (/^\/(?<regex>.*)\/(?<flags>[gmiyuvsd]+)$/i).exec(pattern);
		if (!regexParts || !regexParts.groups) {
			throw new Error(`Invalid regex pattern: ${pattern}`);
		}
		const { regex, flags } = regexParts.groups;
		if (!regex) 
			throw new Error(`Regex pattern is empty in: ${pattern}`);
		//prevent duplicate flags
		const uniqueFlags = flags ? Array.from(new Set(flags.split(""))).join("") : undefined;
		//escape needed characters
		return new RegExp(regex, uniqueFlags);
		
	}

	/**
	 * Generate the prefix from the folder path instead to use a global prefix
	 * It is usable ONLY for subfolders, icons on a one folder level will be loaded with the global prefix
	 * @example tabler-icon/home.svg will be loaded as ti-home, tabler-icon/alerts/alert.svg will be loaded as ti-alerts-alert
	 * @param {string} filePath - The full path of the SVG file
	 */
	generateSvgName(filePath: string) {
		const iconPath = this.getIconFolderPath();
		const pathParts: string[] = filePath
			.replace(iconPath, "")
			.split("/")
			.filter((x) => x.trim().length > 0);
		const baseName = pathParts[pathParts.length - 1]?.replace(".svg", "") || "";
		if (pathParts.length <= 1) return `${this.settings.iconPrefix}${baseName}`;
		if (this.settings.generatePrefixFromPath) {
			const fileName = `${this.getFolderPrefix(filePath, baseName)} ${baseName}`;
			const slugifyOptions = {
				replacement: this.settings.slugify.replacement,
				remove: this.settings.slugify.remove
					? this.transformToRegex(this.settings.slugify.remove)
					: undefined,
				lower: this.settings.slugify.lower,
				trim: this.settings.slugify.trim,
				strict: this.settings.slugify.strict,
			};
			return slugify(fileName, slugifyOptions);
		}
		return `${this.settings.iconPrefix}${pathParts.join("-")}-${baseName}`;
	}

	async loadPluginIcons() {
		try {
			const iconsPath = this.getIconFolderPath();

			const dirExists = await this.app.vault.adapter.exists(iconsPath);
			if (!dirExists) {
				console.warn(`Icons directory does not exist: ${iconsPath}`);
				return;
			}

			const svgFiles = await this.getSvgFilesInFolder(iconsPath);

			if (!svgFiles || svgFiles.length === 0) {
				console.warn(`No SVG files found in: ${iconsPath}`);
				return;
			}

			for (const filePath of svgFiles) {
				try {
					const content = await this.app.vault.adapter.read(filePath);
					const iconName = this.generateSvgName(filePath);
					const processedSvg = this.processSvg(content);
					addIcon(iconName, processedSvg);
				} catch (error) {
					console.error(`Failed to load icon from ${filePath}:`, error);
				}
			}
		} catch (error) {
			console.error("Error loading plugin icons:", error);
		}
	}

	processSvg(svgContent: string) {
		let processed = svgContent
			.replace(/<\?xml.*?\?>/g, "")
			.replace(/<!--.*?-->/gs, "")
			.replace(/<!DOCTYPE.*?>/gs, "");

		if (!processed.includes('xmlns="http://www.w3.org/2000/svg"')) {
			processed = processed.replace(
				"<svg",
				'<svg xmlns="http://www.w3.org/2000/svg"',
			);
		}

		processed = processed.replace(/style="([^"]*)"/g, (_, styleContent) => {
			let newStyle = styleContent;
			let attributes = "";

			if (styleContent.includes("fill:")) {
				const fillMatch = styleContent.match(/fill:\s*([^;]+);?/);
				if (fillMatch?.[1].startsWith("#")) {
					attributes += ` fill="${fillMatch[1]}"`;
					newStyle = newStyle.replace(/fill:\s*[^;]+;?/, "");
				}
			}

			if (styleContent.includes("stroke:")) {
				const strokeMatch = styleContent.match(/stroke:\s*([^;]+);?/);
				if (strokeMatch?.[1].startsWith("#")) {
					attributes += ` stroke="${strokeMatch[1]}"`;
					newStyle = newStyle.replace(/stroke:\s*[^;]+;?/, "");
				}
			}

			newStyle = newStyle.replace(/;$/, "").trim();

			if (newStyle) {
				return `style="${newStyle}"${attributes}`;
			} else {
				return attributes;
			}
		});

		processed = processed
			.replace(/fill="black"/g, 'fill="currentColor"')
			.replace(/stroke="black"/g, 'stroke="currentColor"')
			.replace(/fill="#000"/g, 'fill="currentColor"')
			.replace(/stroke="#000"/g, 'stroke="currentColor"')
			.replace(/fill="#000000"/g, 'fill="currentColor"')
			.replace(/stroke="#000000"/g, 'stroke="currentColor"');

		if (processed.includes("viewBox=")) {
			const viewBoxMatch = processed.match(/viewBox="([^"]+)"/);
			if (viewBoxMatch) {
				const viewBoxParts = viewBoxMatch[1]?.split(/\s+/);
				if (viewBoxParts && viewBoxParts.length === 4) {
					const [x, y, width, height] = viewBoxParts;
					if (x !== "0" || y !== "0") {
						processed = processed.replace(
							/viewBox="[^"]+"/,
							`viewBox="0 0 ${width} ${height}"`,
						);
					}
				}
			}
		} else {
			const sizeMatch = processed.match(/width="([^"]+)" height="([^"]+)"/);
			if (sizeMatch) {
				const width = sizeMatch[1]?.replace("px", "");
				const height = sizeMatch[2]?.replace("px", "");
				processed = processed.replace(
					"<svg",
					`<svg viewBox="0 0 ${width} ${height}"`,
				);
			} else {
				processed = processed.replace("<svg", '<svg viewBox="0 0 24 24"');
			}
		}

		processed = processed
			.replace(/\s+width="[^"]*"/g, "")
			.replace(/\s+height="[^"]*"/g, "");

		processed = processed.replace(/\s+display="none"/g, "");

		return processed;
	}

	processSvgForPreview(svgContent: string) {
		let processed = svgContent
			.replace(/<\?xml.*?\?>/g, "")
			.replace(/<!--.*?-->/gs, "")
			.replace(/<!DOCTYPE.*?>/gs, "");

		if (!processed.includes('xmlns="http://www.w3.org/2000/svg"')) {
			processed = processed.replace(
				"<svg",
				'<svg xmlns="http://www.w3.org/2000/svg"',
			);
		}

		processed = processed.replace(/style="([^"]*)"/g, (_, styleContent) => {
			let newStyle = styleContent;
			let attributes = "";

			if (styleContent.includes("fill:")) {
				const fillMatch = styleContent.match(/fill:\s*([^;]+);?/);
				if (fillMatch?.[1].startsWith("#")) {
					attributes += ` fill="${fillMatch[1]}"`;
					newStyle = newStyle.replace(/fill:\s*[^;]+;?/, "");
				}
			}

			if (styleContent.includes("stroke:")) {
				const strokeMatch = styleContent.match(/stroke:\s*([^;]+);?/);
				if (strokeMatch?.[1].startsWith("#")) {
					attributes += ` stroke="${strokeMatch[1]}"`;
					newStyle = newStyle.replace(/stroke:\s*[^;]+;?/, "");
				}
			}

			newStyle = newStyle.replace(/;$/, "").trim();

			if (newStyle) {
				return `style="${newStyle}"${attributes}`;
			} else {
				return attributes;
			}
		});

		if (processed.includes("viewBox=")) {
			const viewBoxMatch = processed.match(/viewBox="([^"]+)"/);
			if (viewBoxMatch) {
				const viewBoxParts = viewBoxMatch[1]?.split(/\s+/);
				if (viewBoxParts && viewBoxParts.length === 4) {
					const [x, y, width, height] = viewBoxParts;

					if (x !== "0" || y !== "0") {
						processed = processed.replace(
							/viewBox="[^"]+"/,
							`viewBox="0 0 ${width} ${height}"`,
						);
					}
				}
			}
		} else {
			const sizeMatch = processed.match(/width="([^"]+)" height="([^"]+)"/);
			if (sizeMatch) {
				const width = sizeMatch[1]?.replace("px", "");
				const height = sizeMatch[2]?.replace("px", "");
				processed = processed.replace(
					"<svg",
					`<svg viewBox="0 0 ${width} ${height}"`,
				);
			} else {
				processed = processed.replace("<svg", '<svg viewBox="0 0 24 24"');
			}
		}

		processed = processed
			.replace(/\s+width="[^"]*"/g, "")
			.replace(/\s+height="[^"]*"/g, "");

		return processed;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async reloadIcons() {
		new Notice("Reloading My SVGs...");
		try {
			await this.loadPluginIcons();
			new Notice(`My SVGs reloaded! Check console for details.`);
		} catch (error) {
			new Notice("Failed to reload My SVGs. Check console for errors.");
			console.error("Reload error:", error);
		}
	}
	async getSvgFilesInFolder(folderPath: string) {
		const svgFiles: string[] = [];
		try {
			const list = await this.app.vault.adapter.list(folderPath);

			// Collect SVG files in this folder
			if (list && Array.isArray(list.files)) {
				svgFiles.push(
					...list.files.filter((f) => f.toLowerCase().endsWith(".svg")),
				);
			}

			// Recurse into subfolders. Some adapters return 'directories' and some 'folders'.
			const directories = list?.folders || [];
			for (const dir of directories) {
				try {
					const nested = await this.getSvgFilesInFolder(dir);
					svgFiles.push(...nested);
				} catch (err) {
					console.error(`Failed to list directory ${dir}:`, err);
				}
			}
		} catch (err) {
			console.error(`Error reading folder ${folderPath}:`, err);
		}

		return svgFiles;
	}

	onunload() {}
}
