import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
	mathPixSecret: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mathPixSecret: ''
}

export default class P2OPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('dice', 'OCR', () => {
			new CameraModal(this.app).open();
		});

		this.addCommand({
			id: 'ocr',
			name: 'Use OCR',
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new CameraModal(this.app).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new P2OSettingTab(this.app, this));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CameraModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}
}

class P2OSettingTab extends PluginSettingTab {
	plugin: P2OPlugin;

	constructor(app: App, plugin: P2OPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Paper2Obsidian settings'});

		new Setting(containerEl)
			.setName('MathPix API Secret')
			.setDesc('Secret API Key')
			.addText(text => text
				.setPlaceholder('Enter Secret')
				.setValue('')
				.onChange(async (value) => {
					this.plugin.settings.mathPixSecret = value;
					await this.plugin.saveSettings();
				}));
	}
}
