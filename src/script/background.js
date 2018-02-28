var system = {
	menus: {
		transmission: null,
		sites: {}
	},
	clients: {
		default: null,
		transmission: transmission,
		utorrent: utorrent,
		deluge: deluge
	},
	searchTabId: 0,
	optionsTabId: 0,
	// 配置信息
	config: {
		name: "zpz-pt-plugin-config",
		options: {
			droptosend: true,
			defaultclient: "transmission",
			exceedSizeToConfirm: false,
			exceedSize: 100,
			exceedSizeUnit: "GB",
			sites: [],
			transmission: {},
			utorrent: {},
			deluge: {},
			pluginIconShowPages: [
				"torrents.php"
			],
			contextMenuRules: {
				torrentDetailPages: [
					"*://*/details.php*",
					"*://*/plugin_details.php*"
				],
				torrentListPages: [
					"*://*/torrents.php*"
				],
				torrentLinks: [
					"*://*/details.php*",
					"*://*/download.php*", 
					"*://*/plugin_details.php*"
				]
			},
			siteTypes: [],
			search: {
				rows: 5,
				key: "",
				tags: [],
				checkedTags: []
			},
			allowSelectionTextSearch: true
		},
		read: function(callback) {
			chrome.storage.local.get(this.name,
				function(result) {
					system.config.options = $.extend(true, system.config.options, result[system.config.name]);
					if (callback) {
						callback(system.config.options);
					}
				}
			);
			/*
			var local = window.localStorage[this.name];
			if (local)
			{
				var localOptions = JSON.parse(local);
				this.options = $.extend(true, this.options, localOptions);
			}*/
		},
		save: function() {
			//window.localStorage[this.name] = JSON.stringify(this.options);
			chrome.storage.local.set({
				"zpz-pt-plugin-config": this.options
			});
			//chrome.storage.sync.set({"zpz-nexusphp-plugin-config":this.options});
		},
		syncGet: function(callback) {
			chrome.storage.sync.get(this.name,
				function(result) {
					system.config.options = $.extend(true, system.config.options, result[system.config.name]);
					if (callback) {
						callback(system.config.options);
					}
				}
			);
		},
		syncSet: function(callback) {
			this.save();
			chrome.storage.sync.set({
				"zpz-pt-plugin-config": this.options
			},function(){
				if (callback) {
					callback(system.config.options);
				}
			});
		}
	},
	// 用于接收页面发送过的消息
	requestMessage: function(message, sender, callback) {
		switch (message.action.toLowerCase()) {
			// 复制内容到剪切板
			case "toclipboard":
				this.copyTextToClipboard(message.content);
				if (callback) {
					callback();
				}
				break;

			case "set-options-tabid":
				this.optionsTabId = message.id;
				break;

			case "open-options":
				if (this.optionsTabId==0)
				{
					chrome.tabs.create({
						url: "options.html"
					},function(tab){
						system.optionsTabId = tab.id;
					});
				}
				else
				{
					chrome.tabs.get(this.optionsTabId,function(tab){
						if (tab)
						{
							chrome.tabs.update(tab.id, { selected:true });
						}
						else
						{
							chrome.tabs.create({
								url: "options.html"
							},function(tab){
								system.optionsTabId = tab.id;
							});
						}
					});
				}
					
				break;

			case "read-config":
				this.config.read(function(result) {
					system.setDefaulteClient();
					if (callback) {
						callback(result);
					}
				});

				break;

			case "save-config":
				this.config.options = message.config;
				this.setDefaulteClient();
				this.config.save();
				this.initContextMenus();
				break;

			// 从 google 帐户中读取设置信息
			case "read-config-from-google":
				this.config.syncGet(function(result) {
					if (result)
					{
						system.setDefaulteClient();
						if (callback) {
							callback(result);
						}	
					}
					else
					{
						if (callback) {
							callback(null);
						}
					}
					
				});
				break;

			// 将当前设置信息同步至 google 帐户
			case "save-config-to-google":
				this.config.options = message.config;
				this.setDefaulteClient();
				this.config.syncSet(function(){
					if (callback) {
						callback();
					}
				});
				this.initContextMenus();
				break;

			case "create-site-contextmenu":
				this.createSiteFolderContextMenus(message.site);
				break;

			case "send-url-to-client":
				this.sendUrlToClient(message.url, message.folder, function(data) {
					if (callback) {
						callback(data);
					}
				});
				break;
			case "send-url-to-transmission":
				this.sendUrlToTransmission(message.url, message.folder, function(data) {
					if (callback) {
						callback(data);
					}
				});

			case "open-client-webui":
				if (this.clients.default)
				{
					chrome.tabs.create({
						url: this.clients.default.webui
					});
				}
				break;

			case "set-search-tabid":
				this.searchTabId = message.id;
				break;

			case "search-torrent":
				this.config.options.search.key = message.key;
				this.config.save();
				if (this.searchTabId==0)
				{
					chrome.tabs.create({
						url: "search.html?key="+message.key
					},function(tab){
						system.searchTabId = tab.id;
					});
				}
				else
				{
					chrome.tabs.get(this.searchTabId,function(tab){
						if (tab)
						{
							chrome.tabs.update(tab.id, { selected:true });
							chrome.tabs.sendMessage(system.searchTabId, {
								action: "search-torrent",
								key: message.key
							});
						}
						else
						{
							chrome.tabs.create({
								url: "search.html?key="+message.key
							},function(tab){
								system.searchTabId = tab.id;
							});
						}
					});
					
				}
				break;

		}
	},
	setDefaulteClient: function()
	{
		this.clients.default = this.clients[this.config.options.defaultclient];
		this.clients.default.webui = this.config.options[this.config.options.defaultclient].webui;
	},
	init: function() {
		this.config.read(function(){
			system.initContextMenus();
		});
	},
	copyTextToClipboard: function(text) {
		var copyFrom = $('<textarea/>');
		copyFrom.text(text);
		$('body').append(copyFrom);
		copyFrom.select();
		document.execCommand('copy');
		copyFrom.remove();
	},
	initContextMenus: function() {
		chrome.contextMenus.removeAll();
		// 是否启用选择内容时搜索
		if (this.config.options.allowSelectionTextSearch)
		{
			// 选中内容进行搜索
			chrome.contextMenus.create({
				title: "搜索 \"%s\" 相关的种子",
				contexts: ["selection"],
				onclick: function(data, tab) {
					system.requestMessage({
						action: "search-torrent",
						key: data.selectionText
					});
				}
			});
		}
		
		// 复制下载地址
		chrome.contextMenus.create({
			title: "复制下载地址到剪切板",
			documentUrlPatterns: this.config.options.contextMenuRules.torrentListPages,
			targetUrlPatterns: this.config.options.contextMenuRules.torrentLinks,
			contexts: ["link"],
			onclick: function(data, tab) {
				//console.log(data.linkUrl);
				//console.log(tab.url);
				var _indexOf = -1;
				$.each(system.config.options.sites, function(index, item) {
					if (_indexOf != -1) return;
					_indexOf = tab.url.indexOf(item.site);
					if (_indexOf != -1) {
						if (item.dropScript)
						{
							var _script = item.dropScript.replace("\$input-url\$",data.linkUrl);

							chrome.tabs.sendMessage(tab.id, {
								action: "run-script",
								script: _script
							},function(address){
								address = address.replace("\$host\$",tab.url.substr(0, _indexOf) + item.site+"/");
								address = address.replace("\$passkey\$",item.passkey);
								system.requestMessage({
									action: "toclipboard",
									content: address
								});
								chrome.tabs.sendMessage(tab.id, {
									action: "show-message",
									content: address + "已复制到剪切板。"
								});
							});
						}
						else
						{
							var address = tab.url.substr(0, _indexOf) + item.site + "/download.php?id=" + data.linkUrl.getQueryString("id") + "&passkey=" + item.passkey;

							system.requestMessage({
								action: "toclipboard",
								content: address
							});
							chrome.tabs.sendMessage(tab.id, {
								action: "show-message",
								content: address + "已复制到剪切板。"
							});
						}
						//console.log(address);
						
						return;
					}
				});
				if (_indexOf == -1) {
					chrome.tabs.sendMessage(tab.id, {
						action: "show-message",
						content: "站点信息未设置，请先设置站点信息。"
					});
				};
			}
		});

		// 种子详情页面
		chrome.contextMenus.create({
			title: "发送当前页面种子到下载服务器",
			documentUrlPatterns: this.config.options.contextMenuRules.torrentDetailPages,
			contexts: ["page"],
			onclick: function(data, tab) {
				//console.log(data.linkUrl);
				//console.log(tab.url);
				var _indexOf = -1
				$.each(system.config.options.sites, function(index, item) {
					if (_indexOf != -1) return;
					_indexOf = tab.url.indexOf(item.site);
					if (_indexOf != -1) {
						var address = "";
						var folder = null;
						if (item.defaultFolder) {
							folder = item.defaultFolder;
						} else if (item.folders.length > 0) {
							folder = item.folders[0];
						}

						if (item.detailScript) {
							chrome.tabs.sendMessage(tab.id, {
								action: "get-detail-page-torrent-url",
								script: item.detailScript
							}, function(url) {
								url = url.replace("\$passkey\$", item.passkey);
								system.execSendUrlToClient(url, folder, tab);
							});
						} else {
							address = tab.url.substr(0, _indexOf) + item.site + "/download.php?id=" + tab.url.getQueryString("id") + "&passkey=" + item.passkey;
							system.execSendUrlToClient(address, folder, tab);
						}

						return;
					}
				});

				if (_indexOf == -1) {
					chrome.tabs.sendMessage(tab.id, {
						action: "show-message",
						content: "站点信息未设置，请先设置站点信息。"
					});
				};
			}
		});

		
	},
	createContextMenus: function(options) {
		return chrome.contextMenus.create(options);
	},
	clearSiteFolderContextMenus: function(site) {
		if (this.menus.sites[site.site]) {
			$.each(this.menus.sites[site.site], function(index, item) {
				chrome.contextMenus.remove(item);
			});
		}
	},
	createSiteFolderContextMenus: function(site) {
		if (site == null) {
			return;
		}
		//this.clearSiteFolderContextMenus();
		if (this.menus.sites[site.site]) {
			if (this.menus.sites[site.site].length - 1 != site.folders.length) {
				this.clearSiteFolderContextMenus(site);
				this.menus.sites[site.site] = new Array();
			} else {
				return;
			}
		}

		var documentUrlPatterns = [];
		var targetUrlPatterns = [];

		$.each(this.config.options.contextMenuRules.torrentListPages,function(index,item){
			documentUrlPatterns.push(item.replace("\*:\/\/\*\/",site.host));
		});

		$.each(this.config.options.contextMenuRules.torrentLinks,function(index,item){
			targetUrlPatterns.push(item.replace("\*:\/\/\*\/",site.host));
		});

		var menus = new Array();
		if (site.folders.length <= 1) {
			createFolders(undefined, "发送到下载服务器 [%f]");
		} else {
			var parentId = this.createContextMenus({
				title: "发送到 Transmission ...",
				documentUrlPatterns: documentUrlPatterns,
				targetUrlPatterns: targetUrlPatterns,
				contexts: ["link"]
			});

			menus.push(parentId);
			createFolders(parentId);
		}

		this.menus.sites[site.site] = menus;

		function createFolders(parentId, format) {
			if (!format)
				format = "%f";

			if (site.folders.length == 0) {
				menus.push(system.createContextMenus({
					title: format.replace("%f", "默认目录"),
					documentUrlPatterns: documentUrlPatterns,
					targetUrlPatterns: targetUrlPatterns,
					contexts: ["link"],
					onclick: function(data, tab) {
						if (site.dropScript)
						{
							var _script = site.dropScript.replace("\$input-url\$",data.linkUrl);

							chrome.tabs.sendMessage(tab.id, {
								action: "run-script",
								script: _script
							},function(address){
								address = address.replace("\$host\$",site.host);
								address = address.replace("\$passkey\$",site.passkey);
								system.execSendUrlToClient(address, null, tab);
							});
						}
						else
						{
							var address = site.host + "download.php?id=" + data.linkUrl.getQueryString("id") + "&passkey=" + site.passkey;
							system.execSendUrlToClient(address, null, tab);
						}
					}
				}));
				return;
			}
			$.each(site.folders, function(index, folder) {
				menus.push(system.createContextMenus({
					parentId: parentId,
					title: format.replace("%f", folder),
					documentUrlPatterns: documentUrlPatterns,
					targetUrlPatterns: targetUrlPatterns,
					contexts: ["link"],
					onclick: function(data, tab) {
						if (site.dropScript)
						{
							var _script = site.dropScript.replace("\$input-url\$",data.linkUrl);

							chrome.tabs.sendMessage(tab.id, {
								action: "run-script",
								script: _script
							},function(address){
								address = address.replace("\$host\$",site.host);
								address = address.replace("\$passkey\$",site.passkey);
								system.execSendUrlToClient(address, folder, tab);
							});
						}
						else
						{
							var address = site.host + "download.php?id=" + data.linkUrl.getQueryString("id") + "&passkey=" + site.passkey;
							system.execSendUrlToClient(address, folder, tab);
						}
					}
				}));
			});
		};

	},
	execSendUrlToClient: function(address, folder, tab) {
		console.log(address);

		chrome.tabs.sendMessage(tab.id, {
			action: "show-message",
			content: "正在发送链接至下载服务器 ",
			time: 0
		});

		this.sendUrlToClient(address, folder, function(result) {
			chrome.tabs.sendMessage(tab.id, {
				action: "show-message",
				content: result.msg
			});
		});
	},
	sendUrlToClient: function(address, folder, callback) {
		var result = {
			status: "",
			msg: ""
		};
		switch (this.config.options.defaultclient) {
			case "transmission":
				this.sendUrlToTransmission(address, folder, function(data) {
					if (data) {
						if (data.id != undefined) {
							msg = data.name + " 已发送至 Transmission，编号：" + data.id;
							result.status = "success";
						} else if (data.status) {
							switch (data.status) {
								// 重复的种子
								case "duplicate":
									msg = data.torrent.name + " 种子已存在！编号：" + data.torrent.id;
									break;

								case "error":
									msg = "链接发送失败，请检查下载服务器是否可用。";
									break;
								default:
									msg = data.msg;
									break;
							}
							result.status = data.status;
						} else {
							msg = data;
						}
						result.msg = msg;
					}
					if (callback) {
						callback(result);
					}
				});
				break;

			case "utorrent":
			case "deluge":
				this.sendUrlToDefaultClient(address, folder, function(result) {
					if (callback) {
						callback(result);
					}
				});
				break;

			default:
				result.status = "client-undefiend";
				result.msg = "默认下载服务器未设置。";
				if (callback) {
					callback(result);
				}
				break;
		}
	},
	sendUrlToTransmission: function(address, folder, callback) {
		if (!transmission.isInitialized) {
			transmission.init({
				rpcpath: system.config.options.transmission.rpc,
				username: system.config.options.transmission.username,
				password: system.config.options.transmission.password
			}, function(result) {
				if (result) {
					if (result.status == "error") {
						callback(result);
						return;
					}
				}
				transmission.addTorrentFromUrl(address, folder, system.config.options.transmission.autostart, callback);
			});
		} else {
			transmission.addTorrentFromUrl(address, folder, system.config.options.transmission.autostart, callback);
		}
	},
	sendUrlToUTorrent: function(address, folder, callback) {
		if (!utorrent.isInitialized) {
			utorrent.init({
				gui: system.config.options.utorrent.gui,
				username: system.config.options.utorrent.username,
				password: system.config.options.utorrent.password
			}, function() {
				utorrent.addTorrentFromUrl(address, callback);
			});
		} else {
			utorrent.addTorrentFromUrl(address, callback);
		}
	},
	sendUrlToDefaultClient: function(address, folder, callback) {
		var client = this.clients.default;
		if (!client)
			return;

		var options = system.config.options[this.config.options.defaultclient];

		if (!client.isInitialized) {
			client.init({
				gui: options.gui,
				username: options.username,
				password: options.password
			}, function() {
				client.addTorrentFromUrl(address, callback);
			});
		} else {
			client.addTorrentFromUrl(address, callback);
		}
	}
};

// 监听由活动页面发来的消息事件
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
	system.requestMessage(message, sender, sendResponse);
	return true;
});


$(document).ready(function() {
	system.init();
});