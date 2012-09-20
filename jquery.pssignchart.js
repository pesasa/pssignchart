/*********************************************************
 * jquery.pssignchart.js
 * jQuery-plugin for creating a sign chart
 * Petri Salmela
 * pesasa@iki.fi
 * 15.08.2012
 *
 * License: WTFPL
 *    http://sam.zoy.org/wtfpl/COPYING
 ********************************************************/

testilogit = {};


(function($){
    // jQuery plugin
    $.fn.pssignchart = function(options){
        // Test for numberline commands and trigger command with options.
        if (typeof(options) === 'string'){
            var cmd = options;
            options = arguments[1] || {};
            if (typeof(options) === 'string'){
                options = {name: options};
            }
            if (typeof(options) === 'undefined'){
                options = {}
            }
            // Placeholder variable for returning value.
            options.result = this;
            this.trigger(cmd, options);
            return options.result;
        }
        // Extend default settings with user given options.
        var settings = $.extend({
            width: 'auto',              // width of sign chart. Defaults to width of parent element (auto)
            color: 'red',               // highlight color
            theme: "pssc_default"       // html class for styling
        }, options);

        // Return this so that methods of jQuery element can be chained.
        return this.each(function(){
            // Create new Pssignchart object.
            var signchart = new Pssignchart(this, settings);
            // Init the signchart
            signchart.init();
        });
    }
    
    Pssignchart = function(place, settings){
        // Constructor for Pssignchart object.
        this.settings = settings;
        this.place = $(place);
        this.place.addClass('pssignchart');
        this.rows = [];
        this.roots = [];
        this.total = [];
        
        if ($('head style#psscstyle').length == 0){
            $('head').append('<style id="psscstyle" type="text/css">'+Pssignchart.strings['style']+'</style>');
        }
    }
    
    Pssignchart.prototype.init = function(){
        // Init and draw the signchart
        var signchart = this;
        if (this.place.hasClass('pssc_rendered')){
            return false;
        }
        if (this.settings.width == 'auto'){
            this.width = this.place.width();
        } else {
            this.width = this.settings.width;
        }
        this.place.addClass('pssc_rendered').addClass(this.settings.theme);
        var $schart = $('<div class="pssc_tablewrapper"><table class="pssc_table"><tbody></tbody></table></div>');
        this.schartnumber = -1;
        while ($('#signchart_'+(++this.schartnumber)).length > 0){};
        $schart.attr('id','#signchart_'+this.schartnumber)
        this.place.empty().append($schart);
        this.draw();
        this.initEvents();
        return this;
    }
    
    Pssignchart.prototype.draw = function(){
        var signchart = this;
        var $tbody = this.place.find('tbody');
        $tbody.empty();
        for (var i = 0; i < this.rows.length; i++){
            var $trow = $('<tr></tr>');
            $trow.append('<td class="pssc_func"><span class="mathquill">'+this.rows[i].func
                +'</span></td><td class="pssc_motivation" mot="'+Pssignchart.mot[this.getMot(i)]
                +'"><a href="javascript:;"><span></span></a></td>');
            for (var j = 0; j < this.roots.length; j++){
                var $tdata = $('<td class="pssc_sign" sign="'+this.getSign(i, j)+'"></td>');
                if (this.rows[i].isRoot(this.roots[j])){
                    $tdata.addClass('pssc_isroot');
                }
                $trow.append($tdata);
            }
            $trow.append('<td class="pssc_sign" sign="'+this.getSign(i, this.roots.length)+'"></td>');
            $tbody.append($trow);
        }
        for (var i = 0; i < this.total.length; i++){
            var $trow = $('<tr class="pssc_total"></tr>');
            $trow.append('<td colspan="2" class="pssc_total"><span class="mathquill">'+this.total[i].func+'</span></td>');
            for (var j = 0; j < this.roots.length; j++){
                $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(j)+'"></td>');
            }
            $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(this.roots.length)+'"></td>');
        }
        $tbody.append($trow);
        this.place.find('.mathquill').mathquill();
        var $schart = this.place.find('.pssc_tablewrapper');
        $schart.find('.pssc_rootlabel').remove();
        var $tdelem = $tbody.find('tr:eq(0) td:eq(0)');
        var xpos = $tdelem.outerWidth() + $tdelem.next().outerWidth();
        for (var i = 0; i < this.roots.length; i++){
            $tdelem = $tdelem.next('td');
            xpos = xpos + $tdelem.outerWidth();
            $schart.append('<div class="pssc_rootlabel" style="left:'+xpos+'px;"><span class="mathquill">'+this.roots[i].label+'</span></div>');
        }
        this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();
        
        // Init clicks for motivations.
        $tbody.find('td.pssc_motivation a').click(function(){
            var $motlink = $(this);
            var $tdmot = $motlink.parent('td');
            var rownum = $tdmot.parents('tbody').find('tr').index($tdmot.parents('tr').eq(0));
            var newmot = signchart.rows[rownum].nextMot();
            $tdmot.attr('mot', Pssignchart.mot[newmot]);
            signchart.setMot(rownum, newmot);
        });
        
        // Init sign clicks for plus, minus and none.
        $tbody.find('td.pssc_sign').click(function(){
            var $td = $(this);
            var rownum = $td.parents('tbody').find('tr').index($td.parents('tr').eq(0));
            var colnum = $td.parents('tr').eq(0).find('td').index($td) - 2;
            var istotal = $td.parents('tr').eq(0).hasClass('pssc_total');
            if (istotal){
                colnum += 1;
            }
            var sign = $td.attr('sign');
            var newsign;
            switch (sign){
                case 'plus':
                    newsign = 'minus';
                    break;
                case 'minus':
                    newsign = '';
                    break;
                case '':
                    newsign = 'plus';
                    break;
                default:
                    newsign = '';
            }
            $td.attr('sign', newsign);
            if (istotal){
                signchart.setTotalSign(colnum, newsign);
            } else {
                signchart.setSign(rownum, colnum, newsign);
            }
        })
    }
    
    Pssignchart.prototype.isInRoots = function(root){
        result = false;
        for (var i = 0; i < this.roots.length; i++){
            if (this.roots[i].isEqual(root)){
                result = true;
                break;
            }
        }
        return result;
    }
    
    Pssignchart.prototype.addFunc = function(options, nodraw){
        // Add a new function on a new row.
        options = $.extend({
            func: '',
            roots: [],
            signs: []
        }, options);
        for (var i = 0; i < options.roots.length; i++){
            var root = options.roots[i];
            if (typeof(options.roots[i]) === 'number'){
                root = new PsscRoot({label: ''+options.roots[i], value: options.roots[i]});
            } else if (typeof(options.roots[i]) === 'object'
                         && typeof(options.roots[i].label) === 'string'
                         && typeof(options.roots[i].value) === 'number'){
                root = new PsscRoot({label: options.roots[i].label, value: options.roots[i].value});
            }
            options.roots[i] = root;
            if (!this.isInRoots(root)){
                this.roots.push(root);
            };
        }
        var row = new PsscRow(options);
        this.rows.push(row);
        this.roots.sort(function(a,b){return (a.value < b.value ? -1 : 1)});
        if (!nodraw){
            this.draw();
        }
        return this;
    }
    
    Pssignchart.prototype.addTotal = function(options, nodraw){
        options.func = options.func || '';
        options.signs = options.signs || [];
        this.total = [{func: options.func, signs: options.signs}];
        if (!nodraw){
            this.draw();
        }
        return this;
    }
    
    Pssignchart.prototype.setMot = function(row, mot){
        this.rows[row].setMotivation(mot);
    }
    
    Pssignchart.prototype.getMot = function(row){
        return this.rows[row].getMotivation();
    }
    
    Pssignchart.prototype.setSign = function(row, col, sign){
        this.rows[row].setSign(col, sign);
    }
    
    Pssignchart.prototype.getSign = function(row, col){
        return this.rows[row].getSign(col);
    }
    
    Pssignchart.prototype.setTotalSign = function(col, sign){
        this.total[0].signs[col] = sign;
    }
    
    Pssignchart.prototype.getTotalSign = function(col){
        return this.total[0].signs[col];
    }
    
    Pssignchart.prototype.getData = function(options){
        var data = {rows: [], total: {func: "", signs: []}};
        for (var i=0; i<this.rows.length; i++){
            data.rows.push(this.rows[i].getData());
        }
        data.total.func = this.total[0].func;
        data.total.signs = this.total[0].signs;
        options.result = data;
    }
    
    Pssignchart.prototype.setData = function(options){
        this.empty();
        for (var i = 0; i < options.rows.length; i++){
            this.addFunc(options.rows[i], true);
        }
        this.addTotal(options.total, true);
        this.draw();
    }
    
    Pssignchart.prototype.empty = function(){
        this.rows = [];
        this.roots = [];
        this.total = [];
    }
    
    Pssignchart.prototype.initEvents = function(){
        var schart = this;
        this.place.bind('add', function(e, options){
            schart.addFunc(options);
        });

        this.place.bind('total', function(e, options){
            schart.addTotal(options);
        });

        this.place.bind('get', function(e, options){
            return schart.getData(options);
        });
        
        this.place.bind('set', function(e, options){
            schart.setData(options);
        })
        
        return this;
    }
    
    Pssignchart.mot = [
        '',
        'linear-asc',
        'linear-desc',
        'parab-up-0',
        'parab-up-1',
        'parab-up-2',
        'parab-down-0',
        'parab-down-1',
        'parab-down-2'
    ]
    
    Pssignchart.strings = {
        style:
            '.pssc_default {min-height: 2em; background-color: white; padding: 15px; border: 1px solid black; border-radius: 15px; box-shadow: 5px 5px 5px rgba(0,0,0,0.5); margin: 1em 0; text-align: center;'
                + 'background: rgb(254,255,232); /* Old browsers */ background: -moz-linear-gradient(top,  rgba(254,255,232,1) 0%, rgba(214,219,191,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(254,255,232,1)), color-stop(100%,rgba(214,219,191,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#feffe8", endColorstr="#d6dbbf",GradientType=0 ); /* IE6-9 */}'
            +'.pssc_default table.pssc_table {border-collapse: collapse; border: 1px solid black; margin: 0.2em auto;}'
            +'table.pssc_table tr:nth-child(even) td {background-color: #eef;/*#dfb;*/}'
            +'table.pssc_table tr:nth-child(odd) td {background-color: white;}'
            +'table.pssc_table tr.pssc_total {border-top: 4px solid black;}'
            +'.pssc_tablewrapper {margin: 0 auto; padding-top: 1.5em; position: relative; display: inline-block; text-align: left;}'
            +'.pssc_rootlabel {position: absolute; top: 0; width: auto; overflow: visible; text-align: center; height: 0.5em; white-space: nowrap;}'
            +'.pssc_rootlabel > span.mathquill {display: inline-block; position: relative; left: -50%; margin-top: -1em; vertical-align: middle;}'
            +'table.pssc_table td.pssc_isroot {border-right: 2px solid black;}'
            +'table.pssc_table td {min-width: 3em; border-right: 1px dotted black; padding: 0;}'
            +'table.pssc_table td.pssc_func {padding: 0 1em; border-right: none;}'
            +'table.pssc_table td.pssc_motivation {padding: 0 1em; border-right: 1px solid black; cursor: pointer; padding: 0;}'
            +'table.pssc_table td.pssc_motivation a span {width: 30px; height: 20px; display: block; margin: 0 auto;}'
            +'table.pssc_table td.pssc_motivation a {text-align: center; display: block; border: 1px solid #777; border-radius: 4px; margin: 2px;}'
            +'.pssc_default, table.pssc_table td.pssc_motivation a {'
                +'background: rgb(255,255,255); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(255,255,255,1) 0%, rgba(246,246,246,1) 47%, rgba(237,237,237,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(255,255,255,1)), color-stop(47%,rgba(246,246,246,1)), color-stop(100%,rgba(237,237,237,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#ffffff", endColorstr="#ededed",GradientType=0 ); /* IE6-9 */}'
            +'table.pssc_table td.pssc_total {padding: 0 1em; border-right: 1px solid black;}'
            +'table.pssc_table td.pssc_motivation[mot="linear-asc"] span {background-image: url(images/linear-asc.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="linear-desc"] span {background-image: url(images/linear-desc.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-0"] span {background-image: url(images/parab-up-0.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-1"] span {background-image: url(images/parab-up-1.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-2"] span {background-image: url(images/parab-up-2.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-0"] span {background-image: url(images/parab-down-0.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-1"] span {background-image: url(images/parab-down-1.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-2"] span {background-image: url(images/parab-down-2.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_sign {cursor: pointer;}'
            +'table.pssc_table td.pssc_sign[sign="plus"]::before {content: "+"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black;}'
            +'table.pssc_table td.pssc_sign[sign="plus"] {background: rgb(248,80,50); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(248,80,50,1) 0%, rgba(241,111,92,1) 50%, rgba(246,41,12,1) 51%, rgba(240,47,23,1) 71%, rgba(231,56,39,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(248,80,50,1)), color-stop(50%,rgba(241,111,92,1)), color-stop(51%,rgba(246,41,12,1)), color-stop(71%,rgba(240,47,23,1)), color-stop(100%,rgba(231,56,39,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#f85032", endColorstr="#e73827",GradientType=0 ); /* IE6-9 */}'
            +'table.pssc_table td.pssc_sign[sign="minus"]::before {content: "\u2014"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black;}'
            +'table.pssc_table td.pssc_sign[sign="minus"] {background: rgb(183,222,237); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(183,222,237,1) 0%, rgba(113,206,239,1) 50%, rgba(33,180,226,1) 51%, rgba(183,222,237,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(183,222,237,1)), color-stop(50%,rgba(113,206,239,1)), color-stop(51%,rgba(33,180,226,1)), color-stop(100%,rgba(183,222,237,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#b7deed", endColorstr="#b7deed",GradientType=0 ); /* IE6-9 */}'
    }
    
    
    PsscRow = function(options){
        options = $.extend({
            func: '',
            roots: [],
            motivation: 0,
            signs: []
        }, options)
        this.func = options.func;
        this.roots = options.roots;
        this.motivation = options.motivation;
        this.signs = options.signs;
        this.roots.sort(function(a,b){return (a.value < b.value ? -1 : 1)});
    }
    
    PsscRow.prototype.getRoot = function(num){
        return this.roots[num];
    }
    
    PsscRow.prototype.getRootVal = function(num){
        return this.roots[num].val();
    }
    
    PsscRow.prototype.getRootLabel = function(num){
        return this.roots[num].getLabel();
    }
    
    PsscRow.prototype.getRoots = function(){
        return this.roots;
    }
    
    PsscRow.prototype.getFunc = function(){
        return this.func;
    }
    
    PsscRow.prototype.getSign = function(n){
        return this.signs[n];
    }
    
    PsscRow.prototype.setSign = function(n, sign){
        return this.signs[n] = sign;
    }
    
    PsscRow.prototype.getMotivation = function(){
        return this.motivation;
    }
    
    PsscRow.prototype.setMotivation = function(mot){
        return this.motivation = mot;
    }
    
    PsscRow.prototype.getData = function(){
        return jQuery.extend({},{func: this.func, roots: this.roots, motivation: this.motivation, signs: this.signs});
    }
    
    PsscRow.prototype.isRoot = function(root){
        var isroot = false;
        for (var i = 0; i < this.roots.length; i++){
            isroot = this.roots[i].val() == root.val();
            if (isroot){
                break;
            }
        }
        return isroot;
    }
    
    PsscRow.prototype.nextMot = function(){
        this.motivation = ((this.motivation + 1) % Pssignchart.mot.length)
        return this.motivation;
    }
    


    PsscRoot = function(options){
        this.label = options.label;
        this.value = options.value;
    }
    
    PsscRoot.prototype.isEqual = function(other){
        return (this.value === other.value);
    }
    
    PsscRoot.prototype.val = function(){
        return this.value;
    }
    
    PsscRoot.prototype.getLabel = function(){
        return this.label;
    }
    
})(jQuery)

