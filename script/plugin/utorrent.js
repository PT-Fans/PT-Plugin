var utorrent = {
	isInitialized:false
	,host:""
	,port:""
	,path:"/gui/"
	,gui:"/gui/"
	,fullpath:""
	,username:""
	,password:""
	,headers:{}
	,token:""
	,init:function(config,callback)
	{
		jQuery.extend(this, config);

		/*
		if (this.fullpath=="")
		{
			this.fullpath = this.host + (this.port?":"+this.port:"") + this.path;
		}*/
		if (this.username&&this.password)
		{
			this.headers["Authorization"] = "Basic "+(new Base64()).encode(this.username+":"+this.password);
		}

		this.fullpath = this.gui;
		this.getSessionId(this,callback);
	}
	,getSessionId:function(me,callback)
	{
		var settings = {
			type: "GET"
			,url:this.fullpath+"token.html?t="
			,error: function(request,event,settings) 
			{
				
			}
			,success:function(resultData,textStatus)
			{
				me.token = $(resultData).html();
				console.log(me.token);
				me.isInitialized = true;
				if (callback)
				{
					callback();
				}
			}
			,headers:this.headers

		};
		jQuery.ajax(settings);
	}
	/*
		// 添加种子连接
		this.exec({action:"add-url",s:"url"})
	*/
	// 执行相关命令
	,exec:function(config,callback,tags)
	{
		if (!this.isInitialized)
		{
			return false;
		}
		var data = {};

		jQuery.extend(data, config);

		var settings = {
			type: "GET"
			,url:this.fullpath+"?token="+this.token
			,dataType: 'json'
			,data:data
			,success:function(resultData,textStatus)
			{
				if (callback)
				{
					callback(resultData,tags);
				}
			}
			,error:function(request,event,page) 
			{
				console.log(request);
				utorrent.getSessionId(utorrent,function(){
					utorrent.exec(config,callback,tags);
				});
			}
			,headers:this.headers
		};
		jQuery.ajax(settings);
	}
	// 添加种子
	,addTorrentFromUrl:function(url,callback)
	{
		// 磁性连接（代码来自原版WEBUI）
		if (url.match(/^[0-9a-f]{40}$/i)) {
			url = 'magnet:?xt=urn:btih:'+url;
		}
		this.exec(
			{
				action:"add-url",
				s: url
			}
			,function(resultData){
				if (callback)
				{
					var result = {
						status: ""
						,msg: ""
					}
					if (resultData.build)
					{
						result.status = "success";
						result.msg = "URL已添加至 µTorrent 。";
					}
					callback(result);
				}
				console.log(resultData);
			}
		);
	}
};