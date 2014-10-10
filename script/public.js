String.prototype.getQueryString = function(name,split)
{
	if (split==undefined) split="&";
	var reg = new RegExp("(^|"+split+"|\\?)"+ name +"=([^"+split+"]*)("+split+"|$)"), r;
	if (r=this.match(reg)) return decodeURI(r[2]); return null;
};

function log(v){
	console.log(v);
};

//公用函数定义
//格式化数字
Number.prototype.formatNumber = function(f)
{
	this.fStr = function(n, f, p)
	{
		if (n==""||n==undefined)
		{
			if (f==""||f==undefined)
			{
				return "";
			}
			else
			{
				return f;
			}
		}
		var fc = s = r = "", pos;
		if (!p) 
		{
			n = n.split("").reverse().join("");
			f = f.split("").reverse().join("");
		}
		
		for (var i = j = 0; i < f.length; i++, j++) 
		{
			s = n.charAt(j);
			if (s == undefined) continue;
			fc = f.charAt(i);
			switch (fc)
			{
				case "#":
					r += s;
					pos = i;
					break;
				case "0":
					r = s || s == fc ? (r + s) : r + 0;
					pos = i;
					break;//原方法,这里对小数点后的处理有点问题.
				case ".":
					r += s == fc ? s : (j--, fc);
					break;
				case ",":
					r += s == fc ? s : (j--, fc);
					break;
				default:
					r += fc;
					j--;
			}
		}
		if (j != n.length && f.charAt(f.length - 1) != "0" && pos != f.length && f.charAt(pos) != "0") 
			r = r.substr(0, pos + 1) + n.substr(j) + r.substr(pos + 1);
	
		r = (p ? r : r.split("").reverse().join("")).replace(/(^,)|(,$)|(,,+)/g, "");
		if (r.substr(0,1)==",")
		{
			r = r.substr(1);
		}
		if (r.substr(0,2)=="-,")
		{
			r = "-"+r.substr(2);
		}
		return r;
	}
	var n = this.toString();
	if (n.length == 0) 
		return "";
	if (f == undefined) 
		return this;
	f = f.split("."), n = n.split(".");
	return f.length > 1 ? this.fStr(n[0], f[0]) + "." + this.fStr(n[1], f[1], 1) : this.fStr(n[0], f[0]);
};

function formatSize(bytes,zeroToEmpty,type)
{
	if (isNaN(parseFloat(bytes)))
		return (bytes);

	if (bytes==0)
	{
		if (zeroToEmpty==true)
		{
			return "";
		}
		else
		{
			if (type=="speed")
			{
				return "0.00 KB/s";
			}
			else
				return "0.00";
		}
	}
	var r = "";
	var u = "KB";
	if (bytes < 1000 * 1024)
	{
		r = (bytes / 1024);
		u = "KB";
	}		
	else if (bytes < 1000 * 1048576)
	{
		r = (bytes / 1048576);
		u = "MB";
	}
	else if (bytes < 1000 * 1073741824)
	{
		r = (bytes / 1073741824);
		u = "GB";
	}
	else if (bytes < 1000 * 1099511627776)
	{
		r = (bytes / 1099511627776);
		u = "TB";
	}
	else
	{
		r = (bytes / 1125899906842624);
		u = "PB";
	}
	
	if (type=="speed")
	{
		u+="/s";
	}
	
	return (r.formatNumber("###,###,###,###.00 ")+u);
};