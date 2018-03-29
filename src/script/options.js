(function ($) {
	var system = {
		config: {
			sites: new Array(),
			siteTypes: new Array()
		},
		toptipsTimer: null,
		/**
		 * 初始化
		 */
		init: function () {
			$("#tabs").tabs();
			//$("#tabs li").removeClass( "ui-corner-top" ).addClass( "ui-corner-left" );

			$("#tab-clients").tabs();
			//$("#tab-clients li").removeClass( "ui-corner-left" ).addClass( "ui-corner-top" );

			chrome.tabs.getCurrent(function (tab) {
				system.sendMessage({
					action: "set-options-tabid",
					id: tab.id
				});
			});

			// 读取配置信息
			this.sendMessage({
				action: "read-config"
			}, function (config) {
				//alert(config.sites.length);
				system.config = config;
				system.initConfig();
			});

			this.initEvents();
		},
		/**
		 * 初始化事件
		 */
		initEvents: function () {
			$("button").on("click", function (event) {
				event.preventDefault();
			}).button();

			// 新增站点
			$("#button-add-new-site").click(function () {
				$("#table-site").show();
				system.initSiteTags();
			});
			$("#button-site-cancel").click(function () {
				$("#table-site").hide();
				$("#tab-sites").find("*[savedtoclear='1']").val("");
			});

			// 导入一个或多个站点信息
			$("#button-add-import-site").click(function () {
				system.loadFileContent("json", function (content) {
					system.importSites(content);
				});
			});

			// 保存新的站点
			$("#button-site-save").click(function () {
				var parent = $("#tab-sites");
				if (parent.find("#site").val() == "") {
					return;
				}
				var tags = $.map($("#siteTags input:checked"), function (n) {
					return $(n).attr("tag");
				});

				var site = {
					site: parent.find("#site").val(),
					passkey: parent.find("#passkey").val(),
					detailScript: parent.find("#detailScript").val(),
					listAllTorrentUrlScript: parent.find("#listAllTorrentUrlScript").val(),
					dropScript: parent.find("#dropScript").val(),
					folders: new Array(),
					type: parent.find("#type").val(),
					allowSearch: parent.find("#allowSearch").prop("checked"),
					tags: tags,
					disableHttps: parent.find("#disableHttps").prop("checked")
				};

				var siteIndex = system.getSiteIndex(site.site);
				if (siteIndex == -1) {
					system.config.sites.push(site);
					system.addSiteToRow(site);
				} else {
					var _config = system.config.sites[siteIndex];
					_config.passkey = site.passkey;
					_config.detailScript = site.detailScript;
					_config.listAllTorrentUrlScript = site.listAllTorrentUrlScript;
					_config.dropScript = site.dropScript;
					_config.type = site.type;
					_config.allowSearch = site.allowSearch;
					_config.tags = site.tags;
					_config.disableHttps = site.disableHttps;
					system.initSites();
				}

				system.saveConfig();
				site = null;

				parent.find("*[savedtoclear='1']").val("");
				$("#table-site").hide();
			});

			// 添加新的站点对应目录
			$("#button-add-new-site-folder").click(function () {
				var parent = $("#tab-transmission");
				if (parent.find("#site").val() == "") {
					return;
				}
				var item = {
					site: parent.find("#site").val(),
					folder: parent.find("#folder").val(),
					siteIndex: -1,
					defaultFolder: ""
				};

				item.siteIndex = system.getSiteIndex(item.site);
				if (item.siteIndex != -1) {
					if (system.config.sites[item.siteIndex].folders == undefined) {
						system.config.sites[item.siteIndex].folders = new Array();
					}
					system.config.sites[item.siteIndex].folders.push(item.folder);
					system.addSiteFolderToRow(item);
					system.saveConfig();
				}

				site = null;

				parent.find("*[savedtoclear='1']").val("");
			});

			// 保存配置信息
			$("#button-save").click(function () {
				system.saveConfig();
			});

			$("#button-close").click(function () {
				chrome.tabs.getSelected(null, function (tab) {
					chrome.tabs.remove(tab.id);
				});
			});

			$("#button-save-and-close").click(function () {
				system.saveConfig();
				chrome.tabs.getSelected(null, function (tab) {
					chrome.tabs.remove(tab.id);
				});
			});

			// 备份参数设置
			$("#button-config-bak").click(function () {
				system.saveFileAs("PT-plugin-config.json", JSON.stringify(system.config));
			});

			$("#button-config-restore-selectfile").click(function () {
				$("#file-restore").click();
			});

			// 备份参数设置至google帐户
			$("#button-config-sync-save").click(function () {
				var button = $(this);
				button.prop("disabled", true);
				system.sendMessage({
					action: "save-config-to-google",
					config: system.config
				}, function () {
					button.prop("disabled", false);
					system.showSuccessMsg("参数已备份至Google 帐户");
				});
			});

			// 从google帐户中恢复设置
			$("#button-config-sync-get").click(function () {
				var button = $(this);
				button.prop("disabled", true);
				system.sendMessage({
					action: "read-config-from-google"
				}, function (result) {
					debugger;
					if (result) {
						system.config = result;
						system.initConfig();
						system.saveConfig(true);
						system.showSuccessMsg("参数已从Google 帐户中恢复");
					} else {
						alert("加载失败或 Google 帐户中无配置信息。");
					}

					button.prop("disabled", false);
				});
			});

			$("#file-restore").change(function () {
				var restoreFile = $("#file-restore")[0];
				if (restoreFile.files.length > 0 && restoreFile.files[0].name.length > 0) {
					var r = new FileReader();
					r.onload = function (e) {
						if (confirm("确认要从这个文件中恢复配置吗？这将覆盖当前所有设置信息。")) {
							system.config = JSON.parse(e.target.result);
							system.initConfig();
							system.saveConfig(true);
							system.showSuccessMsg("参数已恢复");
						}

					};
					r.onerror = function () {
						system.showErrorMsg("配置信息加载失败");
						console.log("配置信息加载失败");
					};
					r.readAsText(restoreFile.files[0]);
					restoreFile.value = "";
				}
			});

			$("#button-add-new-site-type").click(function () {
				$("#table-site-type").show();
			});

			// 导入一个或多个站点类型信息
			$("#button-add-import-site-type").click(function () {
				system.loadFileContent("json", function (content) {
					system.importSiteTypes(content);
				});
			});

			// 保存站点类型
			$("#button-site-type-save").click(function () {
				var parent = $("#tab-site-types");
				if (parent.find("#name").val() == "") {
					return;
				}

				var fields = ["name", "searchPage", "searchResultType", "getSearchResultScript", "getTorrentTotalSizeScript", "pluginIconShowPages", "torrentListPages", "torrentDetailPages", "torrentLinks"];
				var item = {};
				$.each(fields, function (index, key) {
					var value = parent.find("#" + key).val();
					switch (key) {
						case "pluginIconShowPages":
						case "torrentListPages":
						case "torrentDetailPages":
						case "torrentLinks":
							value = value.split("\n");
							break;
					}
					item[key] = value;
				});

				var index = system.getSiteTypeIndex(item.name);
				if (index == -1) {
					system.config.siteTypes.push(item);
				} else {
					system.config.siteTypes[index] = item;
				}
				system.initSiteTypes();
				system.saveConfig();
				item = null;

				parent.find("*[savedtoclear='1']").val("");
				$("#table-site-type").hide();
			});

			$("#button-site-type-cancel").click(function () {
				$("#table-site-type").hide();
				$("#tab-site-types").find("*[savedtoclear='1']").val("");
			});

			// 添加分类标签
			$("#button-add-search-type-tag").click(function () {
				system.addSearchTypeTag($("#tag").val());
				$("#tag").val("");
			});

			$("#tag").on("keyup", function (e) {
				if (e.keyCode == 13) {
					system.addSearchTypeTag($("#tag").val());
					$("#tag").val("");
				}
			});
		},
		/**
		 * 初始化配置信息
		 */
		initConfig: function () {
			this.initBase();
			this.initSiteTypes();
			this.initSites();
			this.initSiteFolders();
			this.initTransmissionConfig();
			this.initUTorrentConfig();
			this.initDelugeConfig();
			this.initSearchConfig();
		},
		initBase: function () {
			$("#droptosend").prop("checked", this.config.droptosend);
			$("#defaultclient").prop("value", this.config.defaultclient);
			$("#allowSelectionTextSearch").prop("checked", this.config.allowSelectionTextSearch);

			$("#exceedSizeToConfirm").prop("checked", this.config.exceedSizeToConfirm);
			$("#exceedSize").prop("value", this.config.exceedSize);
			$("#exceedSizeUnit").prop("value", this.config.exceedSizeUnit);

			$("#pluginIconShowPages").val(this.config.pluginIconShowPages.join("\n"));
			$("#torrentDetailPages").val(this.config.contextMenuRules.torrentDetailPages.join("\n"));
			$("#torrentListPages").val(this.config.contextMenuRules.torrentListPages.join("\n"));
			$("#torrentLinks").val(this.config.contextMenuRules.torrentLinks.join("\n"));
			$("#version").html(chrome.app.getDetails().version);
		},
		initTransmissionConfig: function () {
			var inputs = $("#table-transmission-options").find("input");
			$.each(inputs, function (index, item) {
				switch (item.type.toLowerCase()) {
					case "text":
					case "password":
					case "textarea":
						$(item).val(system.config.transmission[item.id]);
						break;
					case "checkbox":
						$(item).prop("checked", system.config.transmission[item.id]);
						break;
				}
			});
		},
		initUTorrentConfig: function () {
			var inputs = $("#table-utorrent-options").find("input");
			$.each(inputs, function (index, item) {
				switch (item.type.toLowerCase()) {
					case "text":
					case "password":
					case "textarea":
						$(item).val(system.config.utorrent[item.id]);
						break;
					case "checkbox":
						$(item).prop("checked", system.config.utorrent[item.id]);
						break;
				}
			});
		},
		initDelugeConfig: function () {
			var inputs = $("#table-deluge-options").find("input");
			$.each(inputs, function (index, item) {
				switch (item.type.toLowerCase()) {
					case "text":
					case "password":
					case "textarea":
						$(item).val(system.config.deluge[item.id]);
						break;
					case "checkbox":
						$(item).prop("checked", system.config.deluge[item.id]);
						break;
				}
			});
		},
		// 初始化站点信息
		initSites: function () {
			$("#tbody-sites").empty();
			$.each(this.config.sites, function (index, item) {
				system.addSiteToRow(item);
			});
		},
		// 初始化站点类型
		initSiteTypes: function () {
			$("#tbody-site-types").empty();
			if (!this.config.siteTypes)
				this.config.siteTypes = new Array();
			$.each(this.config.siteTypes, function (index, item) {
				system.addSiteTypeToRow(item);
			});
			var siteType = $("#table-site").find("#type");
			siteType.empty();

			$("<option/>").val("").text("").appendTo(siteType);
			$.each(this.config.siteTypes, function (index, item) {
				$("<option/>").val(item.name).text(item.name).appendTo(siteType);
			});
		},
		// 初始化站点对应的目录列表
		initSiteFolders: function () {
			$("#tbody-site-folders").empty();
			$.each(this.config.sites, function (i, site) {
				if (site.folders && $.isArray(site.folders)) {
					$.each(site.folders, function (index, item) {
						system.addSiteFolderToRow({
							site: site.site,
							folder: item,
							siteIndex: i
						});
					});
				}
			});
		},
		// 初始化搜索分类标签
		initSearchConfig: function () {
			$("#search-type-tags").empty();
			$.each(this.config.search.tags, function (index, item) {
				system.addSearchTypeTag(item, true);
			});

			$("#rows").val(this.config.search.rows);
		},
		// 初始化站点标签
		initSiteTags: function (site) {
			var tags = {};
			if (site) {
				if ($.isArray(site.tags)) {
					$.each(site.tags, function (index, item) {
						tags[item] = true;
					});
				}
			}

			var parent = $("#siteTags");
			parent.empty();

			$.each(this.config.search.tags, function (index, item) {
				$("<input type='checkbox' id='checkbox_" + index + "'/>").attr("tag", item).prop("checked", (tags[item] ? true : false)).appendTo(parent);
				$("<label for='checkbox_" + index + "'/>").html(item).appendTo(parent);
			});
		},
		/**
		 * 导入站点类型
		 */
		importSiteTypes: function(data) {
			var item = data;
			if (typeof (data) === "string") {
				try {
					item = JSON.parse(data);
				} catch (error) {
					this.showErrorMsg("JSON文件解析失败！");
					return;
				}
			}

			if ($.isArray(item)) {
				this.importSiteTypes(item);
				return;
			}

			// 验证数据是否正确
			if (item.hasOwnProperty("name") && item.hasOwnProperty("searchPage") && item.hasOwnProperty("searchResultType")) {
				var index = this.getSiteTypeIndex(item.name);
				if (index == -1) {
					this.config.siteTypes.push(item);
					this.saveConfig(true);
					this.addSiteTypeToRow(item);
				} else {
					this.showErrorMsg("要导入的站点类型：" + item.name + " 已存在。");
				}
			}
		},
		/**
		 * 导入站点
		 */
		importSites: function (data) {
			var item = data;
			if (typeof (data) === "string") {
				try {
					item = JSON.parse(data);
				} catch (error) {
					this.showErrorMsg("JSON文件解析失败！");
					return;
				}
			}

			if ($.isArray(item)) {
				this.importSites(item);
				return;
			}

			// 验证数据是否正确
			if (item.hasOwnProperty("site") && item.hasOwnProperty("type")) {
				var index = this.getSiteIndex(item.site);
				if (index == -1) {
					this.config.sites.push(item);
					this.saveConfig(true);
					this.addSiteToRow(item);
				} else {
					this.showErrorMsg("要导入的站点：" + item.site + " 已存在。");
				}
			}
		},
		// 添加站点类型到列表
		addSiteTypeToRow: function (rowData) {
			var body = $("#tbody-site-types");
			var index = body[0].rows.length + 1;
			var row = $("<tr/>").appendTo(body);

			// 序号
			$("<td/>").css("textAlign", "center").html(index).appendTo(row);
			$("<td/>").html(rowData.name).appendTo(row);
			var cell = $("<td/>").css("textAlign", "center").appendTo(row);
			$("<button/>").html("修改")
				.data("index", index - 1)
				.click(function () {
					var parent = $("#tab-site-types");
					var fields = ["name", "searchPage", "searchResultType", "getSearchResultScript", "getTorrentTotalSizeScript", "pluginIconShowPages", "torrentListPages", "torrentDetailPages", "torrentLinks"];
					var index = $(this).data("index");
					var data = system.config.siteTypes[index];
					$.each(fields, function (index, key) {
						var value = data[key]||"";
						if (value) {
							switch (key) {
								case "pluginIconShowPages":
								case "torrentListPages":
								case "torrentDetailPages":
								case "torrentLinks":
									if ($.isArray(value)) {
										value = value.join("\n");
									}
									break;
							}
						}
						parent.find("#" + key).val(value);
					});
					$("#table-site-type").show();
				})
				.appendTo(cell);

			$("<button/>").html("删除")
				.data("index", index - 1)
				.click(function () {
					var index = $(this).data("index");
					system.config.siteTypes = $.grep(system.config.siteTypes, function (n, i) {
						return i != index;
					});
					system.initSiteTypes();
					system.saveConfig();
				})
				.appendTo(cell);

			$("<button/>").html("分享")
				.data("index", index - 1)
				.click(function () {
					var index = $(this).data("index");
					var item = JSON.parse(JSON.stringify(system.config.siteTypes[index]));

					system.saveFileAs(item.name + ".json", JSON.stringify(item));
				})
				.appendTo(cell);
		},
		// 添加站点到列表
		addSiteToRow: function (site) {
			var body = $("#tbody-sites");
			var rowIndex = body[0].rows.length + 1;
			var row = $("<tr/>").appendTo(body);

			// 序号
			$("<td/>").css("textAlign", "center").html(rowIndex).appendTo(row);
			$("<td/>").html(site.site).appendTo(row);
			$("<td/>").html(site.type).appendTo(row);
			//$("<td/>").html(site.passkey).appendTo(row);
			var tagCell = $("<td id='td_site_" + rowIndex + "'/>").appendTo(row);

			function initTags() {
				var tags = {};
				if ($.isArray(site.tags)) {
					$.each(site.tags, function (index, item) {
						tags[item] = true;
					});
				}

				$.each(system.config.search.tags, function (index, item) {
					$("<input type='checkbox' id='site_" + rowIndex + "_checkbox_" + index + "'/>")
						.attr("tag", item)
						.prop("checked", (tags[item] ? true : false))
						.click(function () {
							site.tags = $.map($("#td_site_" + rowIndex + " input:checked"), function (n) {
								return $(n).attr("tag");
							});
							system.saveConfig();
						})
						.appendTo(tagCell);
					$("<label for='site_" + rowIndex + "_checkbox_" + index + "'/>").html(item).appendTo(tagCell);
				});
			}
			initTags();

			// 允许搜索
			$("<input type='checkbox' style='width:100%;'/>").prop("checked", site.allowSearch)
				.click(function () {
					system.config.sites[rowIndex - 1].allowSearch = this.checked;
					system.saveConfig();
					//system.initSites();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));

			// 禁用HTTPS
			$("<input type='checkbox' style='width:100%;'/>").prop("checked", site.disableHttps)
				.click(function () {
					system.config.sites[rowIndex - 1].disableHttps = this.checked;
					system.saveConfig();
					//system.initSites();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));

			var cell = $("<td/>").css("textAlign", "center").appendTo(row);
			$("<button/>").html("修改")
				.data("index", rowIndex - 1)
				.click(function () {
					var parent = $("#tab-sites");
					var fields = ["site", "passkey", "detailScript", "listAllTorrentUrlScript", "dropScript", "type", "allowSearch", "disableHttps"];
					var index = $(this).data("index");
					var site = system.config.sites[index];
					$.each(fields, function (index, item) {
						switch (item) {
							case "allowSearch":
								parent.find("#" + item).prop("checked", site[item]);
								break;

							case "disableHttps":
								if (site[item] === undefined) {
									site[item] = false;
								}
								parent.find("#" + item).prop("checked", site[item]);
								break;

							default:
								parent.find("#" + item).val(site[item]);
								break;
						}

					});
					system.initSiteTags(site);
					$("#table-site").show();
				})
				.appendTo(cell);

			$("<button/>").html("删除")
				.data("index", rowIndex - 1)
				.click(function () {
					var index = $(this).data("index");
					system.config.sites = $.grep(system.config.sites, function (n, i) {
						return i != index;
					});
					system.initSites();
					system.saveConfig();
				})
				.appendTo(cell);

			$("<button/>").html("分享")
				.data("index", rowIndex - 1)
				.click(function () {
					var index = $(this).data("index");
					var item = JSON.parse(JSON.stringify(system.config.sites[index]));
					delete item.passkey;
					delete item.defaultFolder;
					delete item.folders;

					system.saveFileAs(item.site + ".json", JSON.stringify(item));
				})
				.appendTo(cell);
		},
		// 添加站点目录到列表
		addSiteFolderToRow: function (item) {
			var body = $("#tbody-site-folders");
			var index = body[0].rows.length + 1;
			var row = $("<tr/>").appendTo(body);
			var site = this.config.sites[item.siteIndex];
			// 序号
			$("<td/>").css("textAlign", "center").html(index).appendTo(row);
			$("<td/>").html(item.site).appendTo(row);
			$("<td/>").html(item.folder).appendTo(row);
			// 默认
			$("<input type='checkbox'/>").prop("checked", (site.defaultFolder == item.folder ? true : false))
				.click(function () {
					if (this.checked)
						system.config.sites[item.siteIndex].defaultFolder = item.folder;
					else
						system.config.sites[item.siteIndex].defaultFolder = undefined;

					system.saveConfig();
					system.initSiteFolders();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));

			$("<button/>").html("删除")
				.data("index", index - 1)
				.click(function () {
					var index = $(this).data("index");
					system.config.sites[item.siteIndex].folders = $.grep(system.config.sites[item.siteIndex].folders, function (n, i) {
						return n != item.folder;
					});

					system.initSiteFolders();
					system.saveConfig();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));
		},
		// 添加搜索分类标签
		addSearchTypeTag: function (name, addListOnly) {
			if (!name) return;
			var parent = $("#search-type-tags");

			if (!addListOnly) {
				if ($.inArray(name, this.config.search.tags) != -1)
					return;

				this.config.search.tags.push(name);
				this.saveConfig();
			}

			$("<a class='tag'/>")
				.attr("name", name)
				.attr("href", "javascript:void(0);")
				.attr("title", "点击删除")
				.html(name)
				.click(function () {
					system.removeSearchTypeTag(name);
				})
				.appendTo(parent);

			this.initSites();
		},
		// 移除搜索分类标签
		removeSearchTypeTag: function (name) {
			this.config.search.tags = $.grep(this.config.search.tags, function (n, i) {
				return n != name;
			});

			$.each(this.config.sites, function (index, item) {
				if (!$.isArray(item.tags)) return;
				item.tags = $.grep(item.tags, function (n, i) {
					return n != name;
				});
			});
			this.saveConfig();
			$("#search-type-tags").find("a[name='" + name + "']").remove();
			this.initSites();
		},
		getSiteIndex: function (sitename) {
			var siteindex = -1;
			$.each(this.config.sites, function (index, item) {
				if (item.site == sitename) {
					siteindex = index;
					return;
				}
			});

			return siteindex;
		},
		getSiteTypeIndex: function (name) {
			var resultIndex = -1;
			$.each(this.config.siteTypes, function (index, item) {
				if (item.name == name) {
					resultIndex = index;
					return;
				}
			});

			return resultIndex;
		},
		sendMessage: function (options, callback) {
			if (callback) {
				chrome.extension.sendMessage(options, callback);
			} else {
				chrome.extension.sendMessage(options);
			}
		},
		/**
		 * 保存参数
		 * @param saveOnly 是否仅保存，默认为 false ，表示配置从当前窗口对应的元素中获取值
		 */
		saveConfig: function (saveOnly) {
			if (!saveOnly) {
				// 客户端设置
				var parent = $("#tab-transmission");

				this.config.transmission = {
					server: parent.find("#server").val(),
					port: parent.find("#port").val(),
					username: parent.find("#username").val(),
					password: parent.find("#password").val(),
					rpc: parent.find("#server").val() + ":" + parent.find("#port").val() + "/transmission/rpc",
					autostart: parent.find("#autostart").prop("checked"),
					webui: parent.find("#server").val() + ":" + parent.find("#port").val() + "/transmission/web/"
				};

				parent = $("#table-utorrent-options");

				this.config.utorrent = {
					server: parent.find("#server").val(),
					port: parent.find("#port").val(),
					username: parent.find("#username").val(),
					password: parent.find("#password").val(),
					gui: parent.find("#server").val() + ":" + parent.find("#port").val() + "/gui/",
					webui: parent.find("#server").val() + ":" + parent.find("#port").val() + "/gui/"
				};

				parent = $("#table-deluge-options");

				this.config.deluge = {
					server: parent.find("#server").val(),
					port: parent.find("#port").val(),
					password: parent.find("#password").val(),
					gui: parent.find("#server").val() + ":" + parent.find("#port").val() + "/json",
					webui: parent.find("#server").val() + ":" + parent.find("#port").val() + ""
				};

				this.config.droptosend = $("#droptosend").prop("checked");
				this.config.defaultclient = $("#defaultclient").prop("value");
				this.config.allowSelectionTextSearch = $("#allowSelectionTextSearch").prop("checked");

				this.config.exceedSizeToConfirm = $("#exceedSizeToConfirm").prop("checked");
				this.config.exceedSize = $("#exceedSize").prop("value");
				this.config.exceedSizeUnit = $("#exceedSizeUnit").prop("value");

				this.config.pluginIconShowPages = $("#pluginIconShowPages").val().split("\n");
				this.config.contextMenuRules.torrentDetailPages = $("#torrentDetailPages").val().split("\n");
				this.config.contextMenuRules.torrentListPages = $("#torrentListPages").val().split("\n");
				this.config.contextMenuRules.torrentLinks = $("#torrentLinks").val().split("\n");
				this.config.search.rows = $("#rows").val();
			}

			this.sendMessage({
				action: "save-config",
				config: this.config
			});
		},
		/**
		 * 将指定的内容保存为文件
		 * @param fileName 文件名
		 * @param fileData 文件内容
		 */
		saveFileAs: function (fileName, fileData) {
			try {
				var Blob = window.Blob || window.WebKitBlob;

				// Detect availability of the Blob constructor.
				var constructor_supported = false;
				if (Blob) {
					try {
						new Blob([], {
							"type": "text/plain"
						});
						constructor_supported = true;
					} catch (_) {}
				}

				var b = null;
				if (constructor_supported) {
					b = new Blob([fileData], {
						"type": "text/plain"
					});
				} else {
					// Deprecated BlobBuilder API
					var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
					var bb = new BlobBuilder();
					bb.append(fileData);
					b = bb.getBlob("text/plain");
				}

				saveAs(b, fileName);
			} catch (e) {
				console.log(e.toString());
			}
		},
		showStatusMessage: function (msg, time, status) {
			time = time || 3000;
			status = status || "success";
			if (!this.toptips) {
				this.toptips = $("<div class='toptips toptips_" + status + "'/>").appendTo(document.body);
			}
			clearTimeout(this.toptipsTimer);
			this.toptips.html(msg).show();
			this.toptipsTimer = setTimeout(function () {
				system.toptips.hide()
			}, time);
		},
		showSuccessMsg: function (msg, time) {
			this.showStatusMessage(msg, time, "success");
		},
		showErrorMsg: function (msg, time) {
			this.showStatusMessage(msg, time, "warn");
		},
		/**
		 * 加载指定的文件内容
		 */
		loadFileContent: function (fileType, callback) {
			$("<input id='file-loadContent' type='file' style='display:none;' multiple='true'/>").on("change", function () {
				var fileSelector = this;
				if (fileSelector.files.length > 0 && fileSelector.files[0].name.length > 0) {
					var files = fileSelector.files;
					var count = files.length;
					var index = 0;
					var r = new FileReader();
					r.onload = function (e) {
						callback && callback.call(system, e.target.result);
						readFile();
					};
					r.onerror = function () {
						system.showErrorMsg("文件加载失败");
						console.log("文件加载失败");
						readFile();
					};

					function readFile(file) {

						if (index == count) {
							$(fileSelector).remove();
							fileSelector.value = "";
							return;
						}
						var file = files[index];
						var lastIndex = file.name.lastIndexOf(".");
						var fix = file.name.substr(lastIndex + 1);

						index++;

						if (fileType) {
							if (fix != fileType) {
								system.showErrorMsg("文件类型错误");
								return;
							}
						}

						r.readAsText(file);
					}
					readFile();
				}
			}).click();
		}
	};

	$(document).ready(function () {
		system.init();
	});
})(jQuery);