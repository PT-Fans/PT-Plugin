$(document).ready(function() {
	var items = $("[system-lang]");
	for (var i=0;i< items.length; i++) {
		var item = $(items[i]);
		var key = item.attr("system-lang");
		if (key) {
			var text = chrome.i18n.getMessage(key);
			if (text) {
				if (item.find(".ui-button-text").length>0) {
					item.find(".ui-button-text").html(text);
				} else {
					item.html(text);
				}
			}
		}
	}
});