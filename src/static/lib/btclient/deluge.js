//Deluge
// id:1,method:auth.login,params:[url,null]
// 380 web.download_torrent_from_url
// 2 core.add_torrent_url
var deluge = {
	isInitialized:false
	,host:""
	,port:""
	,path:"/json"
	,gui:"/json"
	,fullpath:""
	,username:""
	,password:""
	,headers:{}
	,token:""
	,sessionID: ""
	,requestCount: -1
	,init:function(config,callback)
	{
		jQuery.extend(this, config);
		this.fullpath = this.gui;
		//this.headers["Cookies"] = "";
		this.getSessionId(this,callback);
	}
	,getSessionId:function(me,callback)
	{
		var data = {
			id: (++this.requestCount),
			method: "auth.login",
			params: [this.password]
		};

		var settings = {
			type: "POST"
			,url:this.fullpath
			,dataType: 'json'
			,data: JSON.stringify(data)
			,processData: false
			,success:function(resultData,textStatus)
			{
				me.isInitialized = true;
				if (callback)
				{
					callback(resultData);
				}
			}
			,error:function(request,event,page) 
			{
				console.log(request);
				_self.getSessionId(_self,function(){
					_self.exec(config,callback,tags);
				});
			}
			,headers:this.headers
		};
		jQuery.ajax(settings);

		/*
		var request = new XMLHttpRequest();
		request.open("POST", this.fullpath, false, null, null);

		try {
			request.send(JSON.stringify(data));

			if (request.status == 200) {
				var response = JSON.parse(request.responseText);
				if (response.result) {
					me.isInitialized = true;
					//var cookie = request.getResponseHeader("Set-Cookie");
					//cookie = cookie.split(";", 1)[0];
					//me.sessionID = cookie;
				}
			} else if (request.status == 404) {
			}
		} catch (e) {}
		*/

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
		var data = {
			id: (++this.requestCount)
		};
		var _self = this;

		jQuery.extend(data, config);

		var settings = {
			type: "POST"
			,url:this.fullpath
			//,dataType: 'json'
			,data: JSON.stringify(data)
			,processData: false
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
				_self.getSessionId(_self,function(){
					_self.exec(config,callback,tags);
				});
			}
			//,headers:this.headers
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
				method:"core.add_torrent_url",
				params: [url,null]
			}
			,function(resultData){
				if (callback)
				{
					var result = {
						status: ""
						,msg: ""
					}
					if (!resultData.error&&resultData.result)
					{
						result.status = "success";
						result.msg = "URL已添加至 Deluge 。";
					}
					callback(result);
				}
				console.log(resultData);
			}
		);
	}
};