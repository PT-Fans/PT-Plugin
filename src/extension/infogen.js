(function($) {
    let Gen = {

        html: `
<div id="tab-extension-infogen" class="top-nav">
    <h1 class="page-header">种子简介生成</h1>
    <p class="hl-green">
        从豆瓣、Bangumi、Steam等站点获取信息并生成符合PT站简介需求的种子简介。
        <br> 如果你输入的是文字形式，则
        <strong>默认使用豆瓣作为搜索工具</strong>，其他搜索工具请在按钮组中选择；链接形式程序会自动处理。
        <br> 试你网络情况，补充信息可能会请求较长时间（如IMDb信息出现“有链接但无评分”情况），在未提示“请求失败”的情况下请耐心等待。
    </p>
    <h2></h2>
    <div class="row">
        <div class="col-sm-8 col-sm-offset-2 col-md-10 col-md-offset-1">
            <div class="input-group">
                <div class="input-control search-box has-icon-left" id="gen-search-key">
                    <input id="gen-link" type="search" class="form-control search-input" placeholder="资源名或豆瓣/IMDB/Bangumi站点的链接">
                    <label for="gen-link" class="input-control-icon-left search-icon"><i class="icon icon-search"></i></label>
                </div>
                <div class="btn-group input-group-btn" style="width: 15%;">
                    <button type="button" class="btn btn-primary" id="gen-search">查询</button>
                    <div class="btn-group">
                        <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
                            <span class="caret"></span>
                            <!--<span class="sr-only">查询</span>-->
                        </button>
                        <ul class="dropdown-menu" role="menu">
                            <li><a id="gen-search-bgm">通过Bangumi查询</a></li>
                            <!--<li><a id="gen-search-steam">通过Steam查询</a></li>-->
                        </ul>
                    </div>
                </div>
            </div>
            <hr>
            <div id="gen-help" class="hide"></div>
            <div id="gen-out" class="zero-clipboard">
                <button class="btn btn-clipboard" data-clipboard-target="#gen-output">复制</button>
                <textarea class="form-control" rows=20 id="gen-output"></textarea>
            </div>
        </div>

    </div>
</div>`,
        search: {
            help_table_text: `<thead><tr><th></th></tr></thead><tbody><tr><td></td></tr>`,  // 子方法请重写该变量
            clean() {
                $("#gen-help").html(`<div class="table-responsive"><table class="table table-hover" id="gen-search-table">${Gen.search.help_table_text}</tbody></table></div>`).show();   // 显示帮助表格
                $("#gen-out").hide();   // 隐藏输出窗口

                // 为所有链接添加DOM监听
                $("a.gen-search-choose").click(function () {
                    let tag = $(this);
                    $('#gen-link').val(tag.attr("data-url"));
                    $("#gen-search").click();
                });
            },   // 所有Search子方法完成后请调用
            douban() {
                $.getJSON(`https://api.douban.com/v2/movie/search?q=${Gen.key()}`, resj => {
                    if (resj.total !== 0) {
                        Gen.search.help_table_text = resj.subjects.reduce((accumulator, currentValue) => {
                            return accumulator += `<tr><td>${currentValue.year}</td><td>${currentValue.subtype}</td><td>${currentValue.title}</td><td><a href='${currentValue.alt}' target='_blank'>${currentValue.alt}</a></td><td><a href='javascript:void(0);' class="gen-search-choose" data-url="${currentValue.alt}">选择</a></td></tr>`;
                        },"<thead><tr><th>年代</th><th>类别</th><th>标题</th><th>豆瓣链接</th><th>行为</th></tr></thead><tbody>");
                        Gen.search.clean();
                    } else {
                        system.showErrorMessage("豆瓣搜索未返回有效数据。");
                    }
                });
            },  // 豆瓣搜索相关
            bangumi() {
                $.getJSON(`https://api.bgm.tv/search/subject/${Gen.key()}?responseGroup=large&max_results=20&start=0`, resj => {
                    let tp_dict = {1: "漫画/小说", 2: "动画/二次元番", 3: "音乐", 4: "游戏", 6: "三次元番"};
                    if (resj.results !== 0) {
                        Gen.search.help_table_text = resj.list.reduce((a,i_item) => {
                            let name = i_item.name_cn ? `${i_item.name_cn} | ${i_item.name}` : i_item.name;
                            return a+= `<tr><td class="nobr">${i_item.air_date}</td><td class="nobr">${tp_dict[i_item.type]}</td><td>${name}</td><td class="nobr"><a href="${i_item.url}" target="_blank">${i_item.url}</a></td><td class="nobr"><a href="javascript:void(0);" class="gen-search-choose" data-url="${i_item.url}">选择</a></td></tr>`
                        },"<thead><tr><td>放送开始</td><td>类别</td><td>名称</td><td>Bangumi链接</td><td>行为</td></tr></thead><tbody>");
                        Gen.search.clean();
                    } else {
                        system.showErrorMessage("Bangumi搜索未返回有效数据。");
                    }
                });
                Gen.search.clean();
            }, // Bangumi搜索相关
            steam() {
                $.ajax({
                    type: "get",
                    url: `https://store.steampowered.com/search/?term=${Gen.key()}`,
                    success: data => {
                        let parser = html_parser(data);
                        let search_list = parser.page.find("div#search_result_container a.search_result_row");
                        if (search_list.length !== 0) {

                            let html = "<thread><tr><td>封面</td><td>游戏（英文）名</td><td>发售日期</td><td>售价</td><td>行为</td></tr></thread><tbody>";
                            search_list.each( (index, element) => {
                                let b_tag = $(element);

                                let url =  b_tag.attr("href");
                                let img = b_tag.find("img").attr("src");
                                let title = b_tag.find("span.title").text().trim();
                                let release = b_tag.find("div.search_released").text().trim();
                                let price = b_tag.find("div.search_price").text().trim();

                                html += `<tr><td><img src="${img}" /></td><td class="nobr">${title}</td><td class="nobr">${release}</td><td class="nobr">${price}</td><td class="nobr"><a href="javascript:void(0);" class="gen-search-choose" data-url="${url}">选择</a></td></tr>`
                            });

                            Gen.search.help_table_text = html;
                            Gen.search.clean();
                        } else {
                            system.showErrorMessage("Steam搜索未返回有效数据。");
                        }
                    }
                })
            }    // Steam 搜索相关
        },

        key() {
            return $("input#gen-link").val().trim();
        },  // 返回搜索的Key

        output(info) {
            $("textarea#gen-output").text(info);
        },  // 将搜索结果填入输出窗口

        gen_locale(subject_url) {
            subject_url = subject_url || Gen.key();
            if (subject_url.match(/\/\/movie\.douban\.com/)) {
                // 以下豆瓣相关解析修改自 `https://greasyfork.org/zh-CN/scripts/38878-电影信息查询脚本` 对此表示感谢
                let fetch = function (anchor) {
                    return anchor[0].nextSibling.nodeValue.trim();
                };

                $.get(subject_url, function (data) {
                    // 检查对应资源是否存在
                    if (/<title>页面不存在<\/title>/.test(data)) {
                        system.showMessage("该链接对应的资源似乎并不存在，你确认没填错");
                    } else {
                        let parser = html_parser(data);
                        system.showMessage("已成功豆瓣获取源页面，开始解析");

                        let movie_id = subject_url.match(/\/subject\/(\d+)/)[1];

                        // 全部需要获取的信息
                        let poster;
                        let this_title, trans_title, aka;
                        let year, region, genre,language,playdate;
                        let imdb_link, imdb_average_rating, imdb_votes, imdb_rating;
                        let douban_link, douban_average_rating, douban_votes, douban_rating;
                        let episodes, duration;
                        let director, writer, cast;
                        let tags,introduction,awards;

                        // 简介生成和填入方法
                        let descriptionGenerator = function () {
                            let descr = "";
                            descr += poster ? `[img]${poster}[/img]\n\n` : "";
                            descr += trans_title ? `◎译　　名　${trans_title}\n` : "";
                            descr += this_title ? `◎片　　名　${this_title}\n` : "";
                            descr += year ? `◎年　　代　${year}\n` : "";
                            descr += region ? `◎产　　地　${region}\n` : "";
                            descr += genre ? `◎类　　别　${genre}\n` : "";
                            descr += language ? `◎语　　言　${language}\n` : "";
                            descr += playdate ? `◎上映日期　${playdate}\n` : "";
                            descr += imdb_rating ? `◎IMDb评分  ${imdb_rating}\n` : "";
                            descr += imdb_link ? `◎IMDb链接  ${imdb_link}\n` : "";
                            descr += douban_rating ? `◎豆瓣评分　${douban_rating}\n` : "";
                            descr += douban_link ? `◎豆瓣链接　${douban_link}\n` : "";
                            descr += episodes ? `◎集　　数　${episodes}\n` : "";
                            descr += duration ? `◎片　　长　${duration}\n` : "";
                            descr += director ? `◎导　　演　${director}\n` : "";
                            descr += writer ? `◎编　　剧　${writer}\n` : "";
                            descr += cast ? `◎主　　演　${cast.replace(/\n/g, '\n' + '　'.repeat(4) + '  　').trim()}\n` : "";
                            descr += tags ? `\n◎标　　签　${tags}\n` : "";
                            descr += introduction ? `\n◎简　　介\n\n　　${introduction.replace(/\n/g, '\n' + '　'.repeat(2))}\n` : "";
                            descr += awards ? `\n◎获奖情况\n\n　　${awards.replace(/\n/g, '\n' + '　'.repeat(2))}\n` : "";

                            Gen.output(descr);
                        };

                        let chinese_title = parser.doc.title.replace('(豆瓣)', '').trim();
                        let foreign_title = parser.page.find('#content h1>span[property="v:itemreviewed"]').text().replace(chinese_title, '').trim();
                        let aka_anchor = parser.page.find('#info span.pl:contains("又名")');
                        if (aka_anchor[0]) {
                            aka = fetch(aka_anchor).split(' / ').sort(function (a, b) {//首字(母)排序
                                return a.localeCompare(b);
                            }).join('/');
                        }
                        if (foreign_title) {
                            trans_title = chinese_title + (aka ? ('/' + aka) : '');
                            this_title = foreign_title;
                        } else {
                            trans_title = aka ? aka : '';
                            this_title = chinese_title;
                        }

                        year = parser.page.find('#content>h1>span.year').text().slice(1, -1);  //年代
                        //产地
                        let regions_anchor = parser.page.find('#info span.pl:contains("制片国家/地区")');
                        if (regions_anchor[0]) {
                            region = fetch(regions_anchor).split(' / ').join('/');
                        }
                        //类别
                        genre = parser.page.find('#info span[property="v:genre"]').map(function () {
                            return $(this).text().trim();
                        }).toArray().join('/');
                        //语言
                        let language_anchor = parser.page.find('#info span.pl:contains("语言")');
                        if (language_anchor[0]) {
                            language = fetch(language_anchor).split(' / ').join('/');
                        }
                        //上映日期
                        playdate = parser.page.find('#info span[property="v:initialReleaseDate"]').map(function () {
                            return $(this).text().trim();
                        }).toArray().sort(function (a, b) {//按上映日期升序排列
                            return new Date(a) - new Date(b);
                        }).join('/');
                        //IMDb链接
                        let imdb_link_anchor = parser.page.find('#info span.pl:contains("IMDb链接")');
                        if (imdb_link_anchor[0]) {
                            imdb_link = imdb_link_anchor.next().attr('href').replace(/(\/)?$/, '/');
                            $.ajax({  // IMDb信息（最慢，不放在请求清单中最先且单独请求）
                                type: "get",
                                url: imdb_link,
                                beforeSend: () => {
                                    system.showMessage("发现IMDb链接，开始请求评分信息，请耐心等待。");
                                },
                                success: data1 => {
                                    parser = html_parser(data1);
                                    imdb_average_rating = parser.page.find("span[itemprop='ratingValue']").text() || "";
                                    imdb_votes = parser.page.find("span[itemprop='ratingCount']").text() || '';
                                    imdb_rating = imdb_votes ? imdb_average_rating + '/10 from ' + imdb_votes + ' users' : '';
                                    descriptionGenerator();
                                },
                                error: () => {
                                    system.showErrorMessage("IMDb资源请求失败。");
                                },
                            });
                        }

                        douban_link = 'https://' + subject_url.match(/movie.douban.com\/subject\/\d+\//);  //豆瓣链接
                        //集数
                        let episodes_anchor = parser.page.find('#info span.pl:contains("集数")');
                        if (episodes_anchor[0]) {
                            episodes = fetch(episodes_anchor);
                        }
                        //片长
                        let duration_anchor = parser.page.find('#info span.pl:contains("单集片长")');
                        if (duration_anchor[0]) {
                            duration = fetch(duration_anchor);
                        } else {
                            duration = parser.page.find('#info span[property="v:runtime"]').text().trim();
                        }

                        descriptionGenerator();   // 预生成一次
                        system.showMessage("豆瓣主页面解析完成，开始请求补充信息，请等待完全请求完成。");

                        $.ajax({
                            type: "get",
                            url: douban_link + 'awards',
                            success: data1 => {
                                let parser = html_parser(data1);
                                awards = parser.page.find('#content>div>div.article').html()
                                    .replace(/[ \n]/g, '')
                                    .replace(/<\/li><li>/g, '</li> <li>')
                                    .replace(/<\/a><span/g, '</a> <span')
                                    .replace(/<(div|ul)[^>]*>/g, '\n')
                                    .replace(/<[^>]+>/g, '')
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/ +\n/g, '\n')
                                    .trim();
                                descriptionGenerator();
                            },
                            error: () => {
                                system.showErrorMessage("豆瓣获奖信息请求失败。");
                            },
                        });    // 该影片的评奖信息
                        $.ajax({
                            type: "get",
                            url: 'https://api.douban.com/v2/movie/' + movie_id,
                            success: data1 => {
                                douban_average_rating = data1.rating.average || 0;
                                douban_votes = data1.rating.numRaters.toLocaleString() || 0;
                                douban_rating = douban_average_rating + '/10 from ' + douban_votes + ' users';
                                introduction = data1.summary.replace(/^None$/g, '暂无相关剧情介绍');
                                poster = data1.image.replace(/s(_ratio_poster|pic)/g, 'l$1');
                                director = data1.attrs.director ? data1.attrs.director.join(' / ') : '';
                                writer = data1.attrs.writer ? data1.attrs.writer.join(' / ') : '';
                                cast = data1.attrs.cast ? data1.attrs.cast.join('\n') : '';
                                tags = data1.tags.map(function (member) {
                                    return member.name;
                                }).join(' | ');
                                descriptionGenerator();
                            },
                            error: () => {
                                system.showErrorMessage("豆瓣其他信息请求失败。");
                            },
                        });  //豆瓣评分，简介，海报，导演，编剧，演员，标签
                    }
                });
            }   // 豆瓣链接
            else if (subject_url.match(/www\.imdb\.com\/title\/(tt\d+)/)) {
                let imdb_id = subject_url.match(/www\.imdb\.com\/title\/(tt\d+)/)[1];
                $.getJSON("https://api.douban.com/v2/movie/imdb/" + imdb_id,(data1) => {
                    if (data1["alt"]) {
                        subject_url = data1["alt"].replace("/movie/","/subject/") + "/";
                        Gen.gen(subject_url);
                    }
                })
            }  // IMDb 链接
            else if (subject_url.match(/\/\/(bgm\.tv|bangumi\.tv|chii\.in)\/subject/)) {
                // 以下Bgm相关解析修改自 `https://github.com/Rhilip/PT-help/blob/master/docs/js/Bangumi%20-%20Info%20Export.user.js` 对此表示感谢a
                const STAFFSTART = 4;                 // 读取Staff栏的起始位置（假定bgm的顺序为中文名、话数、放送开始、放送星期... ，staff从第四个 导演 起算）；初始值为 4（对于新番比较合适）
                const STAFFNUMBER = 9;                // 读取Staff栏数目；初始9，可加大，溢出时按最大可能的staff数读取，如需读取全部请设置值为 Number.MAX_VALUE (或一个你觉得可能最大的值 eg.20)

                $.get(subject_url,function (data) {
                    let parser = html_parser(data);

                    let img = parser.page.find("div#bangumiInfo > div > div:nth-child(1) > a > img").attr("src").replace(/cover\/[lcmsg]/, "cover/l");

                    // 主介绍
                    let story = parser.page.find("div#subject_summary").text();             // Story
                    let raw_staff = [], staff_box = parser.page.find("ul#infobox");        // Staff
                    for (let staff_number = STAFFSTART; staff_number < Math.min(STAFFNUMBER + STAFFSTART, staff_box.children("li").length); staff_number++) {
                        raw_staff[staff_number - STAFFSTART] = staff_box.children("li").eq(staff_number).text();
                        //console.log(raw_staff[staff_number]);
                    }
                    let raw_cast = [], cast_box = parser.page.find("ul#browserItemList");      // TODO fix multi-Cast
                    for (let cast_number = 0; cast_number < cast_box.children("li").length; cast_number++) {    //cast_box.children("li").length
                        let cast_name = cast_box.children("li").eq(cast_number).find("span.tip").text();
                        if (!(cast_name.length)) {     //如果不存在中文名，则用cv日文名代替
                            cast_name = cast_box.children("li").eq(cast_number).find("div > strong > a").text().replace(/(^\s*)|(\s*$)/g, "");   //#browserItemList > li > div > strong > a
                        }
                        let cv_name = cast_box.children("li").eq(cast_number).find("span.tip_j > a");
                        raw_cast[cast_number] = cast_name + ' : ' + cv_name;
                        //console.log(raw_cast[cast_number]);
                    }

                    let outtext = "[img]" +  img + "[/img]\n\n" +
                        "[b]STORY : [/b]\n" + story + "\n\n" +
                        "[b]STAFF : [/b]\n" + raw_staff.join("\n") + "\n\n" +
                        "[b]CAST : [/b]\n" + raw_cast.join("\n") + "\n\n" +
                        "(来源于 " + subject_url + " )\n";

                    Gen.output(outtext);
                });
            }  // Bangumi链接
            else if (subject_url.match(/(store\.)?steam(powered|community)\.com\/app\/\d+/)) {




            }  // TODO Steam链接
            else {
                system.showErrorMessage("似乎并不认识这种链接(ノ｀Д)ノ");
            }  // 不支持的链接
        },  // 本地搜索方法

        gen_remote() {

        },    // TODO 使用远程API服务器

        gen(search_func) {
            search_func = search_func || Gen.search.douban;
            if (/^http/.test(Gen.key())) {  // 识别为链接格式
                $("#gen-help").hide();   // 显示帮助表格
                $("#gen-out").show();   // 隐藏输出窗口
                system.showMessage("识别输入内容为链接格式，开始请求源数据....");
                if ($("#gen-remote").prop("checked")) {
                    Gen.gen_remote();
                } else {  // 使用本地解析
                    Gen.gen_locale();
                }
            } else {
                search_func();  // 默认使用豆瓣搜索文字形式格式
            }
        },

        init() {
            $("#extension").append($(Gen.html).hide());
            // 添加DOM监听
            $("#gen-search").click(() => {Gen.gen();});
            $("#gen-search-bgm").click(() => {Gen.gen(Gen.search.bangumi);});
            $("#gen-search-steam").click(() => {Gen.gen(Gen.search.steam);});
        }
    };

    $(document).ready(function() {
        Gen.init();
    });
})(jQuery);