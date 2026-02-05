import { type App, Notice, PluginSettingTab, Setting } from "obsidian";
import type MySvgsPlugin from "./main";

export class SvgIconsSettingTab extends PluginSettingTab {
	plugin: MySvgsPlugin;
	gridContainer!: HTMLDivElement;

	constructor(app: App, plugin: MySvgsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.addClass("my-svgs-plugin");

		new Setting(containerEl)
			.setName("Icon prefix")
			.setDesc(
				"Prefix for all loaded SVG icons (e.g., 'my-' becomes 'my-filename')",
			)
			.addText((text) =>
				text
					.setPlaceholder("my-")
					.setValue(this.plugin.settings.iconPrefix)
					.onChange(async (value) => {
						this.plugin.settings.iconPrefix = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Custom icons folder path")
			.setDesc(
				"Optional: Specify a custom folder path for your SVG icons (relative to vault root). Leave blank to use the default plugin icons folder.",
			)
			.addText((text) => {
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.customFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.customFolderPath = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.onblur = () => {
					this.display();
				};
			});

		new Setting(containerEl)
			.setName("Generate prefix from path")
			.setDesc(
				"Generate the prefix from the path if the SVG file is in a nested folder. Enable also slugify options",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.generatePrefixFromPath)
					.onChange(async (value) => {
						this.plugin.settings.generatePrefixFromPath = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.generatePrefixFromPath) {
			new Setting(containerEl)
				.setName("Slugify options")
				.setHeading()
				.setDesc(
					"Configure how the svg file names are transformed into icon names when generating prefix from path.",
				);

			new Setting(containerEl)
				.setName("Replacement character")
				.setDesc("Character to replace spaces with in icon names")
				.addText((text) =>
					text
						.setPlaceholder("-")
						.setValue(this.plugin.settings.slugify.replacement)
						.onChange(async (value) => {
							this.plugin.settings.slugify.replacement = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Remove characters regex")
				.setDesc(
					'Regex pattern of characters to remove from icon names (e.g., /[!@#$%^&*(),.?":{}|<>]/g)',
				)
				.addText((text) =>
					text
						.setPlaceholder('/[!@#$%^&*(),.?":{}|<>]/g')
						.setValue(this.plugin.settings.slugify.remove ?? "")
						.onChange(async (value) => {
							this.plugin.settings.slugify.remove = value;
							if (value.trim().length === 0)
								this.plugin.settings.slugify.remove = undefined;
							await this.plugin.saveSettings();
						}),
				);
			new Setting(containerEl)
				.setName("Lowercase")
				.setDesc("Convert icon names to lowercase")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.slugify.lower)
						.onChange(async (value) => {
							this.plugin.settings.slugify.lower = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Strict")
				.setDesc("Strip special characters except replacement")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.slugify.strict)
						.onChange(async (value) => {
							this.plugin.settings.slugify.strict = value;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(containerEl)
				.setName("Trim")
				.setDesc("trim leading and trailing replacement chars")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.slugify.trim)
						.onChange(async (value) => {
							this.plugin.settings.slugify.trim = value;
							await this.plugin.saveSettings();
						}),
				);
		}

		const instructionsSection = containerEl.createEl("div", {
			cls: "my-svgs-instructions-section",
		});

		new Setting(instructionsSection).setHeading().setName("Instructions");

		const instructions = instructionsSection.createEl("div", {
			cls: "my-svgs-setting-item-description",
		});

		const addInstructionsHeading = (text: string) => {
			instructions.createEl("div", {
				cls: "my-svgs-setting-item-description",
				text: text,
			});
		};

		addInstructionsHeading("How to add your custom SVG icons:");
		const list1 = instructions.createEl("ol");
		list1.createEl("li", {
			text: "Find your Obsidian vault folder on your device",
		});
		list1.createEl("li", {
			text: "Navigate to the hidden .obsidian folder inside your vault",
		});
		list1.createEl("li", {
			text: "Go to .obsidian/plugins/my-svgs/icons/ folder (create the icons folder if it doesn't exist)",
		});
		list1.createEl("li", { text: "Copy your SVG files into this folder" });
		list1.createEl("li", {
			text: 'Click the "Reload Now" button to load your new icons',
		});

		addInstructionsHeading("How to use your icons:");
		const list2 = instructions.createEl("ol");
		list2.createEl("li", {
			text: "Your icons will appear in the grid below after reloading",
		});
		list2.createEl("li", {
			text: `Each icon will be named as ${this.plugin.settings.iconPrefix}filename (example: if your file is home.svg, the icon will be ${this.plugin.settings.iconPrefix}home)`,
		});
		list2.createEl("li", { text: "Use the search box to find specific icons" });
		list2.createEl("li", {
			text: "Click the copy button on any icon to copy its name for use in your notes",
		});
		list2.createEl("li", {
			text: 'If you don\'t see your icons, click the "Reload Now" button above the grid',
		});

		const tipContainer = instructions.createEl("div", {
			cls: "my-svgs-setting-item-description my-svgs-tip",
		});
		tipContainer.createEl("strong", { text: "💡 Tip:" });
		tipContainer.createSpan({
			text: ' Can\'t find the .obsidian folder? It might be hidden. On Windows, enable "Show hidden files" in File Explorer. On Mac/Linux, press Cmd+Shift+. (dot) or Ctrl+H to show hidden files.',
		});

		new Setting(containerEl)
			.setName("Reload icons")
			.setDesc("Manually reload all SVG icons from the icons folder")
			.addButton((button) =>
				button
					.setButtonText("Reload now")
					.setCta()
					.onClick(async () => {
						await this.plugin.reloadIcons();
						this.gridContainer.empty();
						this.displayIconsGrid(this.gridContainer);
					}),
			);

		const gridSection = containerEl.createEl("div", {
			cls: "my-svgs-grid-section",
		});
		const gridContainer = gridSection.createEl("div", {
			cls: "my-svgs-grid-wrapper",
		});
		this.gridContainer = gridContainer;

		this.displayIconsGrid(gridContainer);
	}

	async displayIconsGrid(container: HTMLElement) {
		try {
			const iconsPath = this.plugin.getIconFolderPath();
			const dirExists = await this.app.vault.adapter.exists(iconsPath);
			if (!dirExists) {
				const errorMsg = container.createEl("div", {
					cls: "my-svgs-no-icons-message",
				});
				errorMsg.createEl("p", {
					text: `Icons directory not found: ${iconsPath}`,
				});
				errorMsg.createEl("p", {
					text: "Please ensure the icons folder exists and contains SVG files.",
				});
				return;
			}

			const svgFiles = await this.plugin.getSvgFilesInFolder(iconsPath);

			if (svgFiles.length === 0) {
				const errorMsg = container.createEl("div", {
					cls: "my-svgs-no-icons-message",
				});
				errorMsg.createEl("p", {
					text: "No SVG files found in the icons folder.",
				});
				errorMsg.createEl("p", {
					text: `Add some SVG files to ${iconsPath} and reload.`,
				});
				return;
			}

			const header = container.createEl("div", { cls: "my-svgs-grid-header" });

			const titleRow = header.createEl("div", { cls: "my-svgs-title-row" });
			titleRow.createEl("h4", {
				cls: "my-svgs-grid-title",
				text: "Available SVGs",
			});

			const rightSection = titleRow.createEl("div", {
				cls: "my-svgs-title-right",
			});
			const countBadge = rightSection.createEl("span", {
				cls: "my-svgs-icon-count",
				text: `${svgFiles.length} icons`,
			});

			const searchContainer = header.createEl("div", {
				cls: "my-svgs-search-container",
			});
			const searchInput = searchContainer.createEl("input", {
				type: "text",
				placeholder: "Search icons...",
				cls: "my-svgs-icon-search-input",
			});

			const clearBtn = searchContainer.createEl("button", {
				cls: "my-svgs-clear-search-btn",
				text: "✕",
				title: "Clear search",
			});
			clearBtn.setAttribute("data-hidden", "true");

			const grid = container.createEl("div", { cls: "my-svgs-icons-grid" });

			const allIconCards: HTMLDivElement[] = [];

			const filterIcons = (searchTerm: string) => {
				const term = searchTerm.toLowerCase().trim();
				let visibleCount = 0;

				allIconCards.forEach((card) => {
					const iconName = card
						.querySelector(".my-svgs-icon-name")
						?.textContent.toLowerCase();
					const isVisible = iconName?.includes(term);

					card.setAttribute("data-hidden", isVisible ? "false" : "true");
					if (isVisible) visibleCount++;
				});

				countBadge.textContent = term
					? `${visibleCount} of ${svgFiles.length} icons`
					: `${svgFiles.length} icons`;

				clearBtn.setAttribute("data-hidden", term ? "false" : "true");
			};

			searchInput.addEventListener("input", (e) => {
				if (e?.target instanceof HTMLInputElement) filterIcons(e.target.value);
			});

			clearBtn.addEventListener("click", () => {
				searchInput.value = "";
				filterIcons("");
				searchInput.focus();
			});

			for (const filePath of svgFiles) {
				try {
					const iconName = this.plugin.generateSvgName(filePath);

					const card = grid.createEl("div", { cls: "my-svgs-icon-card" });
					allIconCards.push(card);

					const preview = card.createEl("div", { cls: "my-svgs-icon-preview" });

					try {
						const svgContent = await this.app.vault.adapter.read(filePath);
						const processedSvg = this.plugin.processSvgForPreview(svgContent);
						const parser = new DOMParser();
						const svgDoc = parser.parseFromString(processedSvg, "text/html");
						const svgElement = svgDoc.body.firstChild;
						if (svgElement) {
							preview.appendChild(svgElement);
						}
					} catch (error) {
						console.error(`Failed to read SVG ${filePath}:`, error);
						preview.createEl("div", { text: "📄" });
					}

					card.createEl("div", {
						cls: "my-svgs-icon-name",
						text: iconName,
					});

					const copyBtn = card.createEl("button", {
						cls: "my-svgs-copy-button",
						text: "Copy",
					});

					copyBtn.addEventListener("click", () => {
						navigator.clipboard
							.writeText(iconName)
							.then(() => {
								new Notice(`Copied: ${iconName}`);
							})
							.catch(() => {
								const textArea = document.createElement("textarea");
								textArea.value = iconName;
								document.body.appendChild(textArea);
								textArea.select();
								document.execCommand("copy");
								document.body.removeChild(textArea);
								new Notice(`Copied: ${iconName}`);
							});
					});
				} catch (error) {
					console.error(`Failed to process icon ${filePath}:`, error);

					const errorCard = grid.createEl("div", {
						cls: "my-svgs-icon-card my-svgs-error",
					});
					errorCard.createEl("div", {
						cls: "my-svgs-icon-preview",
						text: "❌",
					});
					const fileName = this.plugin.generateSvgName(filePath);
					errorCard.createEl("div", {
						cls: "my-svgs-icon-name",
						text: `Error loading ${fileName}`,
					});
				}
			}
		} catch (error) {
			console.error("Error displaying icons grid:", error);
			const errorMsg = container.createEl("div", {
				cls: "my-svgs-error-message",
			});
			errorMsg.createEl("p", {
				text: `Error loading icons: ${(error as Error).message}`,
			});
		}
	}
}
