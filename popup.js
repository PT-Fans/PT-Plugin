var system = {
	config: {},
	init: function(){
		$("#btnSearch").click(function(event) {
			system.search();
		});

		$("#options").click(function(event) {
			chrome.extension.sendMessage({
				action: "open-options"
			});
		});

		$("#search-key").on("keyup",function(e){
			if (e.keyCode==13)
			{
				system.search();
			}
		});

		chrome.extension.sendMessage({
			action: "read-config"
		},function(config){
			system.config = config;
			$("#search-key").val(config.search.key);
			system.initTags();
		});
	},
	search: function(){
		this.config.search.checkedTags = $.map($("#tags input:checked"),function(n){return $(n).attr("tag");});
		chrome.extension.sendMessage({
			action: "save-config",
			config: this.config
		});
		chrome.extension.sendMessage({
			action: "search-torrent",
			key: $("#search-key").val()
		});
	},
	// 初始标签
	initTags: function() {
		var tags = {};
		if ($.isArray(this.config.search.checkedTags))
		{
			$.each(this.config.search.checkedTags, function(index,item){
				tags[item] = true;
			});
		}

		var parent = $("#tags");
		parent.empty();

		$.each(this.config.search.tags, function(index,item){
			$("<input type='checkbox' id='checkbox_"+index+"'/>").attr("tag",item).prop("checked",(tags[item]?true:false)).appendTo(parent);
			$("<label for='checkbox_"+index+"'/>").html(item).appendTo(parent);
		});
	}
};

$(document).ready(function() {
	system.init();
});