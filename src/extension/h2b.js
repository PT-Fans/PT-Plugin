(function($) {
    let H2B = {
        html: `
<div id="tab-extension-h2b" class="top-nav">
    <h1 class="page-header">HTML <-> BBCode</h1>
    <p class="hl-green">HTML、BBCode转换器</p>
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
                        <td>
                            <button id="button-config-sync-save" class="btn">HTML -> BBCode</button>
                            <button id="button-config-sync-get" class="btn">BBCode -> HTML</button>
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


        init() {

            $("#extension").append($(H2B.html).hide());
            $.getScript("static/lib/kindeditor/kindeditor.min.js").done(() => {
                KindEditor.create('textarea.kindeditor', {
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
            });

            // 添加DOM监听
        }
    };

    $(document).ready(function() {
        H2B.init();
    });
})(jQuery);