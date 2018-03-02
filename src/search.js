var system = {
	config: {
		sites: new Array(),
		siteTypes: new Array()
	},
	statusMessageBox: null,
	init: function () {
		$("#btnSearch").click(function (event) {
			system.search($("#search-key").val());
		});

		$("#search-key").on("keyup", function (e) {
			if (e.keyCode == 13) {
				system.search(this.value);
			}
		});

		this.sendMessage({
			action: "read-config"
		}, function (config) {
			//alert(config.sites.length);
			system.config = config;
			system.initTags();
			var key = location.href.getQueryString("key");
			if (key) {
				system.search(key);
			}
		});
		//$("#search-result").load("templates/search-result.html");
		this.resize();
	},
	// 初始标签
	initTags: function () {
		var tags = {};
		if ($.isArray(this.config.search.checkedTags)) {
			$.each(this.config.search.checkedTags, function (index, item) {
				tags[item] = true;
			});
		}

		var parent = $("#tags");
		parent.empty();

		$.each(this.config.search.tags, function (index, item) {
			$("<input type='checkbox' id='checkbox_" + index + "'/>").attr("tag", item).prop("checked", (tags[item] ? true : false)).appendTo(parent);
			$("<label for='checkbox_" + index + "'/>").html(item).appendTo(parent);
		});
	},
	search: function (key) {
		$("#tbody-result").empty();
		this.setSearchKey(key);
		this.sendMessage({
			action: "read-config"
		}, function (config) {
			//alert(config.sites.length);
			system.config = config;
			system.searchTorrent(key, function (result) {
				log(result);
			});
		});
	},
	setSearchKey: function (key) {
		$("#search-key").val(key);
		this.config.search.key = key;
		this.config.search.checkedTags = $.map($("#tags input:checked"), function (n) {
			return $(n).attr("tag");
		});
		chrome.extension.sendMessage({
			action: "save-config",
			config: this.config
		});
	},
	sendMessage: function (options, callback) {
		if (callback) {
			chrome.extension.sendMessage(options, callback);
		} else {
			chrome.extension.sendMessage(options);
		}
	},
	requestMessage: function (message, callback) {
		switch (message.action.toLowerCase()) {
			case "search-torrent":
				$("#search-key").val(message.key);
				this.search(message.key);
				break;

		}
	},
	getSiteType: function (name) {
		var type = "";
		$.each(this.config.siteTypes, function (index, item) {
			if (item.name == name) {
				type = item;
				return;
			}
		});

		return type;
	},
	getSearchPage: function (name) {
		var page = "";
		$.each(this.config.siteTypes, function (index, item) {
			if (item.name == name) {
				page = item.searchPage;
				return;
			}
		});

		return page;
	},
	getSite: function (name) {
		var site = null;
		for (var i = 0; i < this.config.sites.length; i++) {
			site = this.config.sites[i];
			if (site.site == name) {
				break;
			}
		};
		return site;
	},
	checkTag: function (site) {
		if (!$.isArray(site.tags)) return false;
		if (site.tags.length == 0) return false;

		var tags = {};
		var result = false;
		if ($.isArray(this.config.search.checkedTags)) {
			$.each(this.config.search.checkedTags, function (index, item) {
				if ($.inArray(item, site.tags) != -1) {
					result = true;
				}
			});
		}

		return result;
	},
	// 搜索种子
	searchTorrent: function (key, callback) {
		var rows = this.config.search.rows;
		if (isNaN(parseInt(rows))) {
			rows = 5;
		}
		var urls = [];
		var scripts = [];
		var sites = [];
		var errors = [];
		$("#status").hide();

		$.each(this.config.sites, function (index, item) {
			if (item.allowSearch && system.checkTag(item)) {
				var siteType = system.getSiteType(item.type);
				var url = system.getSiteHost(item) + siteType.searchPage;
				var script = siteType.getSearchResultScript;

				url = system.replaceKeys(url, {
					key: key,
					rows: rows,
					passkey: system.getSite(item.site).passkey
				});

				urls.push(url);
				scripts.push(script);
				sites.push(item.site);
			}
		});

		doSearch(urls, urls.length, callback);

		function doSearch(items, count, callback) {
			var index = count - items.length;
			var url = urls.shift();

			if (!url) {
				system.showStatusMessage("搜索完成。", 6);
				if (errors.length > 0) {
					$("#status").html(errors.join("<br/>")).show();
					setTimeout(function(){
						$("#status").fadeOut();
					}, 5000);
				}
				return;
			}
			var site = sites[index];
			system.showStatusMessage("正在搜索 [" + site + "]..." + (index + 1) + "/" + count + ".", 0);
			var settings = {
				url: url,
				success: function (result, textStatus) {
					doSearch(urls, count, callback);
					if (result && (typeof result=="string" && result.length > 100) || (typeof result == "object")) {
						var script = scripts[index];

						if (script) {
							eval(script);
						}
					} else {
						errors.push(site + " 搜索异常。[" + result + "]");
					}
				},
				error: function () {
					errors.push(site + " 搜索失败。");
					doSearch(urls, count, callback);
				}
			};

			jQuery.ajax(settings);
		}
	},
	replaceKeys: function (source, keys) {
		$.each(keys, function (key, value) {
			source = source.replace("\$" + key + "\$", value);
		});

		return source;
	},
	getSiteHost: function (site) {
		if (site.host) return site.host;
		return ((site.disableHttps===true?"http://":"https://") + site.site);
	},
	addSearchResult: function (datas) {
		$.each(datas, function (index, item) {
			if (index < system.config.search.rows)
				system.addRow(item);
		});
	},
	addRow: function (data) {
		var body = $("#tbody-result");
		var index = body[0].rows.length + 1;
		var row = $("<tr/>").appendTo(body);

		// 序号
		$("<td/>").css("textAlign", "center").html(index).appendTo(row);
		// 标题
		$("<a/>").attr("href", data.link).html(data.title).attr("target", "_blank").appendTo($("<td/>").appendTo(row));
		// 操作
		var buttons = $("<td/>").css("textAlign", "center").appendTo(row);
		// 发送到下载服务器
		$("<div/>").click(function () {
			var folder = null;
			var url = data.downloadURL;
			var site = system.getSite(data.source);
			if (site.defaultFolder) {
				folder = site.defaultFolder;
			} else if (site.folders.length > 0) {
				folder = site.folders[0];
			}

			system.showStatusMessage("正在发送链接地址 " + url + " 到下载服务器", 0);
			chrome.extension.sendMessage({
				action: "send-url-to-client",
				url: url,
				folder: folder
			}, function (result) {
				system.showStatusMessage(result.msg, 5);
			});
		}).attr("class", "link sendToDownload").attr("title", "发送到下载服务器").appendTo(buttons);
		// log(data.downloadURL);
		// 大小
		$("<td/>").css("textAlign", "right").html(data.size).appendTo(row);
		// 发布人
		$("<td/>").html(data.author).appendTo(row);
		// 时间
		$("<td/>").html(data.date).appendTo(row);
		// 来源
		$("<td/>").html(data.source).appendTo(row);
	},
	showStatusMessage: function (msg, time) {
		if (!this.statusMessageBox) {
			this.statusMessageBox = $("<div/>").css({
				top: -500,
				width: "auto"
			}).attr("class", "status-messages").html(msg).appendTo($(document.body));
		}

		if (time == undefined) {
			time = 3000;
		} else {
			time = time * 1000;
		}

		this.statusMessageBox.html(msg);

		var top = jQuery(window).height() - this.statusMessageBox.height() - 30;
		var left = jQuery(window).width() - this.statusMessageBox.width() - 50;
		this.statusMessageBox.css({
			top: top + "px",
			left: left + "px"
		});

		if (time == 0) {
			this.statusMessageBox.stop().show();
		} else {
			this.statusMessageBox.stop().show().fadeOut(time);
		}
	},
	resize: function () {
		$("#search-result").height($(window).height() - $("#search-result").position().top - 10);
	}
};

$(document).ready(function () {
	system.init();
});

$(window).resize(function () {
	system.resize();
})

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	system.requestMessage(message, sendResponse);
	return true;
});