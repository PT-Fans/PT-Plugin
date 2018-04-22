(function($) {
    let H2B = {
        html: `<div id="tab-extension-h2b" class="top-nav">
    <h1 class="page-header">HTML与BBCode互转工具</h1>
    <p class="hl-green">HTML、BBCode转换器，用来处理转发种子的简介信息。</p>
    <div class="row">
        <div class="col-md-12">
            <table class="table tv">
                <tbody>
                    <tr>
                        <td>
                            <h4>HTML 富文本编辑器(直接编辑，或进入源代码页面复制粘贴)</h4></td>
                        <td>
                            <label for="h2b-html"></label>
                            <textarea class="form-control kindeditor" rows=12 id="h2b-html" style="height:150px;"></textarea>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h4>转换</h4></td>
                        <td align="center">
                            <button id="extension-button-h2b" class="btn">HTML -> BBCode</button>
                            <button id="extension-button-b2h" class="btn">BBCode -> HTML</button>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <h4>BBCode 代码</h4></td>
                        <td>
                            <div id="h2b-bbcode-div" class="zero-clipboard">
                                <button class="btn btn-clipboard" data-clipboard-target="#h2b-bbcode">复制</button>
                                <textarea class="form-control" rows=12 id="h2b-bbcode"></textarea>
                            </div>

                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>`,
        editor: {},  // 注册 KindEditor 实例

        html2ubb() {
            $.getScript("static/lib/htmlconverter/html2bbcode.js", () => {
                let converter = new html2bbcode.HTML2BBCode();
                let bbcode = converter.feed(H2B.editor.html());
                $("#h2b-bbcode").text(bbcode.toString());
            });
        },

        ubb2html(){
            $.getScript("static/lib/htmlconverter/bbcode2html.js", () => {
                let converter = new XBBCODE().process({
                    text: $("#h2b-bbcode").val()
                });
                H2B.editor.html(converter.html.replace(/\n/ig,"<br>"));
            });
        },

        init() {
            $("#extension").append($(H2B.html).hide());  // 注册DOM组件
            $.getScript("static/lib/kindeditor/kindeditor.min.js").done(() => {
                H2B.editor = KindEditor.create('textarea.kindeditor', {
                    width : '100%',
                    basePath: '/static/lib/kindeditor/',
                    bodyClass : 'article-content',
                    resizeType : 1,
                    allowPreviewEmoticons : false,
                    allowImageUpload : false,
                    items : [ "source",'|',
                        'fontname', 'fontsize', '|', 'forecolor', 'hilitecolor', 'bold', 'italic', 'underline',
                        'removeformat', '|', 'justifyleft', 'justifycenter', 'justifyright', 'insertorderedlist',
                        'insertunorderedlist', '|', 'image', 'link'
                    ]
                });
            });   // 加载KindEditor库并实例化HTML富文本编辑器

            // 添加DOM监听
            $("#extension-button-h2b").click(() => {H2B.html2ubb();});
            $("#extension-button-b2h").click(() => {H2B.ubb2html();});
        }
    };

    $(document).ready(function() {
        H2B.init();
    });
})(jQuery);