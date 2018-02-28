(function($) {
	var system = {
		config: {
			sites: new Array(),
			siteTypes: new Array()
		},
		init: function() {
			$("button").on("click",function(event){
				event.preventDefault();
			}).button();

			$("#tabs").tabs();
			//$("#tabs li").removeClass( "ui-corner-top" ).addClass( "ui-corner-left" );

			$("#tab-clients").tabs();
			//$("#tab-clients li").removeClass( "ui-corner-left" ).addClass( "ui-corner-top" );

			chrome.tabs.getCurrent(function(tab){
				system.sendMessage({
					action:"set-options-tabid",
					id: tab.id
				});
			});

			this.sendMessage({
				action: "read-config"
			}, function(config) {
				//alert(config.sites.length);
				system.config = config;
				system.initConfig();
			});

			$("#button-add-new-site").click(function() {
				$("#table-site").show();
				system.initSiteTags();
			});
			$("#button-site-cancel").click(function() {
				$("#table-site").hide();
				$("#tab-sites").find("*[savedtoclear='1']").val("");
			});

			// 添加新的站点
			$("#button-site-save").click(function() {
				var parent = $("#tab-sites");
				if (parent.find("#site").val() == "") {
					return;
				}
				var tags = $.map($("#siteTags input:checked"),function(n){return $(n).attr("tag");});

				var site = {
					site: parent.find("#site").val(),
					passkey: parent.find("#passkey").val(),
					detailScript: parent.find("#detailScript").val(),
					listAllTorrentUrlScript: parent.find("#listAllTorrentUrlScript").val(),
					dropScript: parent.find("#dropScript").val(),
					folders: new Array(),
					type: parent.find("#type").val(),
					allowSearch: parent.find("#allowSearch").prop("checked"),
					tags: tags
				};

				var siteIndex = system.getSiteIndex(site.site);
				if (siteIndex == -1) {
					system.config.sites.push(site);
					system.addSiteToRow(site);
				} else {
					system.config.sites[siteIndex].passkey = site.passkey;
					system.config.sites[siteIndex].detailScript = site.detailScript;
					system.config.sites[siteIndex].listAllTorrentUrlScript = site.listAllTorrentUrlScript;
					system.config.sites[siteIndex].dropScript = site.dropScript;
					system.config.sites[siteIndex].type = site.type;
					system.config.sites[siteIndex].allowSearch = site.allowSearch;
					system.config.sites[siteIndex].tags = site.tags;
					system.initSites();
				}

				system.saveConfig();
				site = null;

				parent.find("*[savedtoclear='1']").val("");
				$("#table-site").hide();
			});

			// 添加新的站点对应目录
			$("#button-add-new-site-folder").click(function() {
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
			$("#button-save").click(function() {
				system.saveConfig();
			});

			$("#button-close").click(function() {
				chrome.tabs.getSelected(null, function(tab) {
					chrome.tabs.remove(tab.id);
				});
			});

			$("#button-save-and-close").click(function() {
				system.saveConfig();
				chrome.tabs.getSelected(null, function(tab) {
					chrome.tabs.remove(tab.id);
				});
			});

			// 备份参数设置
			$("#button-config-bak").click(function() {
				system.saveFileAs("PT-plugin-config.json", JSON.stringify(system.config));
			});

			$("#button-config-restore-selectfile").click(function() {
				$("#file-restore").click();
			});

			// 备份参数设置至google帐户
			$("#button-config-sync-save").click(function() {
				var button = $(this);
				button.prop("disabled", true);
				system.sendMessage({
					action: "save-config-to-google",
					config: system.config
				}, function() {
					button.prop("disabled", false);
				});
			});

			// 从google帐户中恢复设置
			$("#button-config-sync-get").click(function() {
				var button = $(this);
				button.prop("disabled", true);
				system.sendMessage({
					action: "read-config-from-google"
				}, function(result) {
					if (result) {
						system.config = result;
						system.initConfig();
						system.saveConfig(true);
					} else {
						alert("加载失败或 Google 帐户中无配置信息。");
					}

					button.prop("disabled", false);
				});
			});

			$("#file-restore").change(function() {
				var restoreFile = $("#file-restore")[0];
				if (restoreFile.files.length > 0 && restoreFile.files[0].name.length > 0) {
					var r = new FileReader();
					r.onload = function(e) {
						if (confirm("确认要从这个文件中恢复配置吗？这将覆盖当前所有设置信息。")) {
							system.config = JSON.parse(e.target.result);
							system.initConfig();
							system.saveConfig(true);
						}

					};
					r.onerror = function() {
						console.log("配置信息加载失败");
					};
					r.readAsText(restoreFile.files[0]);
					restoreFile.value = "";
				}
			});

			$("#button-add-new-site-type").click(function() {
				$("#table-site-type").show();
			});

			// 保存站点类型
			$("#button-site-type-save").click(function() {
				var parent = $("#tab-site-types");
				if (parent.find("#name").val() == "") {
					return;
				}
				var item = {
					name: parent.find("#name").val(),
					searchPage: parent.find("#searchPage").val(),
					searchResultType: parent.find("#searchResultType").val(),
					getSearchResultScript: parent.find("#getSearchResultScript").val(),
					getTorrentTotalSizeScript: parent.find("#getTorrentTotalSizeScript").val()
				};

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

			$("#button-site-type-cancel").click(function() {
				$("#table-site-type").hide();
				$("#tab-site-types").find("*[savedtoclear='1']").val("");
			});

			// 添加分类标签
			$("#button-add-search-type-tag").click(function() {
				system.addSearchTypeTag($("#tag").val());
				$("#tag").val("");
			});

			$("#tag").on("keyup",function(e){
				if (e.keyCode==13)
				{
					system.addSearchTypeTag($("#tag").val());
					$("#tag").val("");
				}
			});
		},
		initConfig: function() {
			this.initBase();
			this.initSiteTypes();
			this.initSites();
			this.initSiteFolders();
			this.initTransmissionConfig();
			this.initUTorrentConfig();
			this.initDelugeConfig();
			this.initSearchConfig();
		},
		initBase: function() {
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
		},
		initTransmissionConfig: function() {
			var inputs = $("#table-transmission-options").find("input");
			$.each(inputs, function(index, item) {
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
		initUTorrentConfig: function() {
			var inputs = $("#table-utorrent-options").find("input");
			$.each(inputs, function(index, item) {
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
		initDelugeConfig: function() {
			var inputs = $("#table-deluge-options").find("input");
			$.each(inputs, function(index, item) {
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
		initSites: function() {
			$("#tbody-sites").empty();
			$.each(this.config.sites, function(index, item) {
				system.addSiteToRow(item);
			});
		},
		// 初始化站点类型
		initSiteTypes: function() {
			$("#tbody-site-types").empty();
			if (!this.config.siteTypes)
				this.config.siteTypes = new Array();
			$.each(this.config.siteTypes, function(index, item) {
				system.addSiteTypeToRow(item);
			});
			var siteType = $("#table-site").find("#type");
			siteType.empty();

			$("<option/>").val("").text("").appendTo(siteType);
			$.each(this.config.siteTypes, function(index, item) {
				$("<option/>").val(item.name).text(item.name).appendTo(siteType);
			});
		},
		// 初始化站点对应的目录列表
		initSiteFolders: function() {
			$("#tbody-site-folders").empty();
			$.each(this.config.sites, function(i, site) {
				$.each(site.folders, function(index, item) {
					system.addSiteFolderToRow({
						site: site.site,
						folder: item,
						siteIndex: i
					});
				});
			});
		},
		// 初始化搜索分类标签
		initSearchConfig: function() {
			$.each(this.config.search.tags,function(index,item){
				system.addSearchTypeTag(item,true);
			});

			$("#rows").val(this.config.search.rows);
		},
		// 初始化站点标签
		initSiteTags: function(site) {
			var tags = {};
			if (site)
			{
				if ($.isArray(site.tags))
				{
					$.each(site.tags, function(index,item){
						tags[item] = true;
					});
				}
			}

			var parent = $("#siteTags");
			parent.empty();

			$.each(this.config.search.tags, function(index,item){
				$("<input type='checkbox' id='checkbox_"+index+"'/>").attr("tag",item).prop("checked",(tags[item]?true:false)).appendTo(parent);
				$("<label for='checkbox_"+index+"'/>").html(item).appendTo(parent);
			});
		},
		// 添加站点类型到列表
		addSiteTypeToRow: function(rowData) {
			var body = $("#tbody-site-types");
			var index = body[0].rows.length + 1;
			var row = $("<tr/>").appendTo(body);

			// 序号
			$("<td/>").css("textAlign", "center").html(index).appendTo(row);
			$("<td/>").html(rowData.name).appendTo(row);
			var cell = $("<td/>").css("textAlign", "center").appendTo(row);
			$("<button/>").html("修改")
				.data("index", index - 1)
				.click(function() {
					var parent = $("#tab-site-types");
					var fields = ["name", "searchPage", "searchResultType", "getSearchResultScript", "getTorrentTotalSizeScript"];
					var index = $(this).data("index");
					var data = system.config.siteTypes[index];
					$.each(fields, function(index, item) {
						parent.find("#" + item).val(data[item]);
					});
					$("#table-site-type").show();
				})
				.appendTo(cell);

			$("<button/>").html("删除")
				.data("index", index - 1)
				.click(function() {
					var index = $(this).data("index");
					system.config.siteTypes = $.grep(system.config.siteTypes, function(n, i) {
						return i != index;
					});
					system.initSiteTypes();
					system.saveConfig();
				})
				.appendTo(cell);
		},
		// 添加站点到列表
		addSiteToRow: function(site) {
			var body = $("#tbody-sites");
			var rowIndex = body[0].rows.length + 1;
			var row = $("<tr/>").appendTo(body);

			// 序号
			$("<td/>").css("textAlign", "center").html(rowIndex).appendTo(row);
			$("<td/>").html(site.site).appendTo(row);
			$("<td/>").html(site.type).appendTo(row);
			//$("<td/>").html(site.passkey).appendTo(row);
			var tagCell = $("<td id='td_site_"+rowIndex+"'/>").appendTo(row);

			function initTags(){
				var tags = {};
				if ($.isArray(site.tags))
				{
					$.each(site.tags, function(index,item){
						tags[item] = true;
					});
				}

				$.each(system.config.search.tags, function(index,item){
					$("<input type='checkbox' id='site_"+rowIndex+"_checkbox_"+index+"'/>")
						.attr("tag",item)
						.prop("checked",(tags[item]?true:false))
						.click(function(){
							site.tags = $.map($("#td_site_"+rowIndex+" input:checked"),function(n){return $(n).attr("tag");});
							system.saveConfig();
						})
						.appendTo(tagCell);
					$("<label for='site_"+rowIndex+"_checkbox_"+index+"'/>").html(item).appendTo(tagCell);
				});
			}
			initTags();

			// 允许搜索
			$("<input type='checkbox'/>").prop("checked", site.allowSearch)
				.click(function() {
					system.config.sites[rowIndex - 1].allowSearch = this.checked;
					system.saveConfig();
					//system.initSites();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));

			var cell = $("<td/>").css("textAlign", "center").appendTo(row);
			$("<button/>").html("修改")
				.data("index", rowIndex - 1)
				.click(function() {
					var parent = $("#tab-sites");
					var fields = ["site", "passkey", "detailScript", "listAllTorrentUrlScript", "dropScript", "type", "allowSearch"];
					var index = $(this).data("index");
					var site = system.config.sites[index];
					$.each(fields, function(index, item) {
						switch (item) {
							case "allowSearch":
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
				.click(function() {
					var index = $(this).data("index");
					system.config.sites = $.grep(system.config.sites, function(n, i) {
						return i != index;
					});
					system.initSites();
					system.saveConfig();
				})
				.appendTo(cell);
		},
		// 添加站点目录到列表
		addSiteFolderToRow: function(item) {
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
				.click(function() {
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
				.click(function() {
					var index = $(this).data("index");
					system.config.sites[item.siteIndex].folders = $.grep(system.config.sites[item.siteIndex].folders, function(n, i) {
						return n != item.folder;
					});

					system.initSiteFolders();
					system.saveConfig();
				})
				.appendTo($("<td/>").css("textAlign", "center").appendTo(row));
		},
		// 添加搜索分类标签
		addSearchTypeTag: function(name,addListOnly){
			if (!name) return;
			var parent = $("#search-type-tags");

			if (!addListOnly)
			{
				if ($.inArray(name,this.config.search.tags)!=-1)
					return;

				this.config.search.tags.push(name);
				this.saveConfig();
			}
			
			$("<a class='tag'/>")
				.attr("name",name)
				.attr("href","javascript:void(0);")
				.attr("title","点击删除")
				.html(name)
				.click(function(){
					system.removeSearchTypeTag(name);
				})
				.appendTo(parent);

			this.initSites();
		},
		// 移除搜索分类标签
		removeSearchTypeTag: function(name) {
			this.config.search.tags = $.grep(this.config.search.tags, function(n, i) {
				return n != name;
			});

			$.each(this.config.sites,function(index,item){
				if (!$.isArray(item.tags)) return;
				item.tags = $.grep(item.tags, function(n, i) {
					return n != name;
				});
			});
			this.saveConfig();
			$("#search-type-tags").find("a[name='"+name+"']").remove();
			this.initSites();
		},
		getSiteIndex: function(sitename) {
			var siteindex = -1;
			$.each(this.config.sites, function(index, item) {
				if (item.site == sitename) {
					siteindex = index;
					return;
				}
			});

			return siteindex;
		},
		getSiteTypeIndex: function(name) {
			var resultIndex = -1;
			$.each(this.config.siteTypes, function(index, item) {
				if (item.name == name) {
					resultIndex = index;
					return;
				}
			});

			return resultIndex;
		},
		sendMessage: function(options, callback) {
			if (callback) {
				chrome.extension.sendMessage(options, callback);
			} else {
				chrome.extension.sendMessage(options);
			}
		},
		saveConfig: function(saveOnly) {
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
		saveFileAs: function(fileName, fileData) {
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
		}
	};

	$(document).ready(function() {
		system.init();
	});
})(jQuery);