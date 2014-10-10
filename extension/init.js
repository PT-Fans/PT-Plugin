var system = {
	// 页面操作按钮层
	shower: jQuery("<div class='plugin-body' style='display:none;'/>").appendTo(jQuery(document.body)),
	droper: jQuery("<div style='display:none;z-index:100;' class='droper'/>"),
	buttonBar: jQuery("<div style='display:none;' class='button-bar'/>"),
	buttons: new Array(),
	positions: [{
		x: 35,
		y: 60
	}, {
		x: 60,
		y: 90
	}, {
		x: 60,
		y: 120
	}, {
		x: 35,
		y: 150
	}],
	status: 0,
	config: null,
	site: null,
	init: function() {
		this.shower.click(function() {
			if (system.status == 0) {
				system.buttonBar.show();
				system.status = 1;
			} else {
				system.buttonBar.hide();
				system.status = 0;
			}
		});
		var top = jQuery(window).height() / 2 - this.shower.height() / 2;
		var left = jQuery(window).width() - this.shower.width() - 2;
		this.shower.css({
			top: top + "px",
			left: left + "px"
		}).show();
		this.buttonBar.appendTo(this.shower);
		var y = top - 40;
		var x = [left - 10, left - 40, left - 40, left - 10];

		jQuery.each(this.positions, function(index, item) {
			item.y = y;
			item.x = x[index];
			y += 30;
		});

		this.initButtons();
		this.initSiteMenus();
		this.initDrop();
	},
	initButtons: function() {
		this.addButton({
			key: "copy",
			tip: "获取当前页的种子下载链接到剪切板",
			action: function() {
				//log(system.getSize($(".torrents").find("td:contains('MB'),td:contains('GB')")));
				

				var urls = system.getDownloadAddress();
				if (urls.length == 0)
					return;
				// 发送消息
				chrome.extension.sendMessage({
					action: "toClipboard",
					content: urls.join("\n")
				}, function() {
					system.showStatusMessage(urls.length + "个地址已复制到剪切板");
				});
			}
		});

		this.addButton({
			key: "download",
			tip: "将当前页的种子下载链接到发送到下载服务器",
			action: function() {
				var size = system.checkSize();

				if (size!==true)
				{
					if (!confirm("当前页面种子容量为 "+size+" 已超过 "+system.config.exceedSize+" "+system.config.exceedSizeUnit+"，是否发送？"))
					{
						return;
					}
				}
				
				var _urls = system.getDownloadAddress();
				if (_urls.length == 0)
					return;
				var folder = null;
				if (system.site.defaultFolder) {
					folder = system.site.defaultFolder;
				} else if (system.site.folders.length > 0) {
					folder = system.site.folders[0];
				}
				addTorrentsToServer(_urls, _urls.length, folder);

				function addTorrentsToServer(urls, count, savepath, callback) {
					var index = count - urls.length;
					var url = urls.shift();
					if (!url) {
						system.showStatusMessage(count + "条链接已发送完成。");
						return;
					}
					system.showStatusMessage("正在发送：" + url + "(" + (count - index) + "/" + count + ")", 0);
					chrome.extension.sendMessage({
						action: "send-url-to-client",
						url: url,
						folder: savepath
					}, function(data) {
						addTorrentsToServer(urls, count, savepath, callback);
					});
				}
			}
		});

		this.addButton({
			key: "webui",
			tip: "打开客户端WEBUI",
			action: function() {
				chrome.extension.sendMessage({
					action: "open-client-webui"
				});
			}
		});

		this.addButton({
			key: "config",
			tip: "参数设置",
			action: function() {
				//window.open("chrome-extension://mggjibpagkemifpmbokhekbbdnicjibd/options.html");
				chrome.extension.sendMessage({
					action: "open-options"
				});
			}
		});
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
	checkSize: function() {
		if (!this.config.exceedSizeToConfirm) return true;

		var siteType = this.config.siteTypes[this.getSiteTypeIndex(this.site.type)];
		if (siteType.getTorrentTotalSizeScript)
		{
			var result = eval(siteType.getTorrentTotalSizeScript);
			var size = this.getSize(result);
			var exceedSize = 0;
			switch (this.config.exceedSizeUnit)
			{
				case "MB":
					exceedSize = (this.config.exceedSize*1048576);
					break;

				case "GB":
					exceedSize = (this.config.exceedSize*1073741824);
					break;

				case "T":
				case "TB":
					exceedSize = (this.config.exceedSize*1099511627776);
					break;
			}

			return (size>=exceedSize?formatSize(size):true);
		}
		return true;
	},
	addButton: function(options) {
		var def = {
			key: "",
			text: "",
			tip: "",
			action: null
		};
		options = jQuery.extend(true, def, options);

		var button = jQuery("<div class='button'/>").attr("title", options.tip);
		jQuery("<div class='link-" + options.key + "'/>")
			.html(options.text)
			.appendTo(button);

		if (options.action)
			button.click(options.action);
		button.appendTo(this.buttonBar);
		this.buttons.push(button);
		this.resetButtonsPosition();
	},
	// 重新设置按钮位置
	resetButtonsPosition: function() {
		var positions = this.positions;
		jQuery.each(this.buttons, function(index, button) {
			button.css({
				left: positions[index].x,
				top: positions[index].y
			});
		});
	},
	// 获取当前页面下载地址
	getDownloadAddress: function() {

		if (!this.site) {
			//alert("站点信息未设置");
			system.showStatusMessage("站点信息未设置，请先设置站点信息。", 6);
			return [];
		}

		var urls;
		if (this.site.listAllTorrentUrlScript)
		{
			var _script = this.site.listAllTorrentUrlScript;
			_script = _script.replace("\$input-host\$",system.site.host);
			_script = _script.replace("\$input-passkey\$",system.site.passkey);
			urls = eval(_script);
			if ($.isArray(urls))
			{
				var _urls = [];
				$.each(urls,function(index,item){
					//item = item.replace("\$site\$",system.site.host);
					item = item.replace("\$host\$",system.site.host);
					item = item.replace("\$passkey\$",system.site.passkey);
					_urls.push(item);
				});

				urls = _urls;
			}
		}
		else
		{
			var torrents = jQuery("a[href*='download']").toArray();
			urls = jQuery.map(torrents, function(n) {
				return system.site.host + jQuery(n).attr("href") + "&passkey=" + system.site.passkey;
			});
		}


		return urls;
	},
	showStatusMessage: function(msg, time) {
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
	// 初始化当前站点菜单
	initSiteMenus: function() {
		if (!this.site) return;
		// 创建当前站点菜单
		chrome.extension.sendMessage({
			action: "create-site-contextmenu",
			site: this.site
		});
	},
	requestMessage: function(message, callback) {
		switch (message.action.toLowerCase()) {
			case "show-message":
				this.showStatusMessage(message.content, message.time);
				if (callback) {
					callback();
				}
				break;

			case "get-detail-page-torrent-url":
				var _script = message.script;
				_script = _script.replace("\$input-host\$",system.site.host);
				_script = _script.replace("\$input-passkey\$",system.site.passkey);
				var url = eval(_script);
				if (callback) {
					callback(url);
				}
				break;

			case "run-script":
				var _script = message.script;
				_script = _script.replace("\$input-host\$",system.site.host);
				_script = _script.replace("\$input-passkey\$",system.site.passkey);
				var result = eval(_script);
				if (callback) {
					callback(result);
				}
				break;

		}
	},
	initDrop: function() {
		if (!system.config.droptosend) return;

		this.droper.appendTo(this.shower);
		this.droper[0].addEventListener("dragover", function(e) {
			//console.log(e);
			e.stopPropagation();
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
			if (e.target.tagName == "A") {
				e.dataTransfer.setData('text/plain', e.target.getAttribute('href'));
			}

			//console.log(e);
			//system.debug("#dropArea.dragover");
		}, false);

		this.shower[0].addEventListener("dragover", function(e) {
			e.stopPropagation();
			e.preventDefault();
			system.droper.show();
		}, false);

		this.droper[0].addEventListener("drop", function(e) {
			//console.log(e);
			e.stopPropagation();
			e.preventDefault();
			system.droper.hide();
			if (!system.site)
			{
				system.showStatusMessage("请先设置站点信息。");
				return;
			}

			var url = e.dataTransfer.getData('text/plain');
			if (url) {
				if (system.site.dropScript)
				{
					var _script = system.site.dropScript.replace("\$input-url\$",url);
					_script = _script.replace("\$input-host\$",system.site.host);
					_script = _script.replace("\$input-passkey\$",system.site.passkey);

					url = eval(_script);
					//url = url.replace("\$site\$",system.site.host);
					url = url.replace("\$host\$",system.site.host);
					url = url.replace("\$passkey\$",system.site.passkey);
				}
				else
				{
					id = url.getQueryString("id");
					if (id) {
						if (system.site && system.config.droptosend) {
							url = system.site.host + "download.php?id=" + id + "&passkey=" + system.site.passkey;
						}
					}
				}
				console.log(url);
				var folder = null;
				if (system.site.defaultFolder) {
					folder = system.site.defaultFolder;
				} else if (system.site.folders.length > 0) {
					folder = system.site.folders[0];
				}

				system.showStatusMessage("正在发送链接地址 " + url + " 到下载服务器", 0);
				chrome.extension.sendMessage({
					action: "send-url-to-client",
					url: url,
					folder: folder
				}, function(result) {
					system.showStatusMessage(result.msg, 5);
				});

			}
			//console.log(e.dataTransfer.getData('text/plain'));
			//system.debug("drop.e.dataTransfer:",e.dataTransfer);
			//system.checkDropFiles(e.dataTransfer.files);
		}, false);

		this.droper[0].addEventListener("dragleave", function(e) {
			e.stopPropagation();
			e.preventDefault();
			system.droper.hide();
			//system.debug("dragleave");
		}, false);
	},
	getSize: function(source){
		var total = 0;

		$.each(source,function(index,item){
			var size = parseFloat($(item).text().replace(/[A-Za-z]/g,""));
			var unit = $(item).text().replace(/[^A-Za-z]/g,"");
			switch (unit)
			{
				case "MB":
					total +=(size*1048576);
					break;

				case "GB":
					total +=(size*1073741824);
					break;

				case "T":
				case "TB":
					total +=(size*1099511627776);
					break;
			}
		});

		return (total);
	},
	debug: function(label, msg) {
		console.log(label + ":" + msg);
	},
	test: function() {
		var parent = jQuery("a>img.uploading").parent().parent();
		var options = {
			ids: jQuery.map(parent.find("a[href*='download']").toArray(), function(n) {
				return jQuery(n).attr("href").replace("download.php?id=", "");
			})
		};
	}
};

// 获取参数
chrome.extension.sendMessage({
	action: "read-config"
}, function(config) {
	system.config = config;
	if (config.sites.length) {
		$.each(config.sites, function(index, item) {
			if (item.site == window.location.hostname) {
				system.site = item;
				system.site.host = window.location.protocol + "//" + window.location.host + "/";
				config.sites[index] = system.site;
			}
		});
	}

	// 判断是否显示图标
	$.each(config.pluginIconShowPages, function(index, item) {
		if (document.location.pathname.indexOf(item) != -1) {
			system.init();
			return;
		}
	});
});


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	system.requestMessage(message, sendResponse);
	return true;
});

// jQuery 扩展
// 淡入谈出
(function($) {
	$.fn.fadeInAndOut = function(speed, delay, easing, callback) {
		var options = null;
		if (typeof(speed) == "object") {
			options = speed;
		} else {
			options = {
				speed: speed,
				easing: easing,
				delay: delay,
				callback: callback
			};
		}
		options = $.extend($.fn.fadeInAndOut.defaults, options);
		return this.fadeIn(options.speed).delay(options.delay).fadeOut(options.speed, options.easing, options.callback);
	};

	// 插件的defaults    
	$.fn.fadeInAndOut.defaults = {
		speed: 1000,
		easing: "swing",
		delay: 1000,
		callback: null
	};
})(jQuery);

//alert("sendMessage-begin");
//chrome.extension.sendMessage(options);
//alert("sendMessage-end");