import {App, MarkdownPreviewView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {settings} from "cluster";

const APP_ID = "william_williambl_com_d69487_ef83ae";

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
			new CameraModal(this.app, this).open();
		});

		this.addCommand({
			id: 'ocr',
			name: 'Use OCR',
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new CameraModal(this.app, this).open();
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
	closeFunc: () => void = null
	plugin: P2OPlugin

	constructor(app: App, plugin: P2OPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		let {contentEl} = this;
		const button = contentEl.createEl('button', {text: 'Take Photo'});
		contentEl.createEl('br');
		const videoElement = contentEl.createEl('video', {attr: {'autoplay': true}});
		const canvas = contentEl.createEl('canvas');
		const canvasContext = canvas.getContext('2d');

		navigator.mediaDevices.getUserMedia({video: true})
			.then(stream => {
				videoElement.srcObject = stream;
				this.closeFunc = () => {
					stream.getTracks().forEach(track => track.stop());
				}
			}).catch(() => {
			alert('could not connect stream');
		});

		button.addEventListener('click', () => {
			canvas.width = videoElement.videoWidth;
			canvas.height = videoElement.videoHeight;
			console.log(canvas)
			canvasContext.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
			canvas.toBlob(async blob => {
				const formData = new FormData();
				formData.append('options_json', '{"math_inline_delimiters": ["$", "$"], "rm_spaces": true}');
				formData.append('file', blob);

				const res = await (
					fetch('https://api.mathpix.com/v3/text', {
						method: 'POST',
						headers: new Headers({
							'app_id': APP_ID,
							'app_key': this.plugin.settings.mathPixSecret
						}),
						body: formData
					})
						.then(res => this.validateResponse(res))
				)

				if (res[0]) {
					const json: any = res[1];
					const leaf = this.app.workspace.activeLeaf;
					if (leaf.view instanceof MarkdownView) {
						leaf.view.editor.setValue(leaf.view.editor.getValue()+json.text);
					}
				} else {
					const err: string = res[1];
					new Notice(err);
				}
				this.blobToDataURL(blob, (b: any) => console.log(b));
				this.close();
			});
		});
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
		this.closeFunc();
	}

	async validateResponse(res: Response): Promise<[false, string] | [true, any]> {
		if (!res.ok) {
			return [false, "MathPix API returned error: "+res.status]
		}
		const json = await res.json();
		if (json.error !== undefined) {
			return [false, "MathPix API returned error: "+json.error]
		}
		return [true, null]
	}

	blobToDataURL(blob: Blob, callback: any) {
		const a = new FileReader();
		a.onload = function(e) {callback(e.target.result);}
		a.readAsDataURL(blob);
	}}

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
