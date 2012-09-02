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
        // Constructor for Psnumberline object.
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
            $trow.append('<td><span class="mathquill pssc_func">'+this.rows[i].func+'</span></td>');
            for (var j = 0; j < this.roots.length; j++){
                var $tdata = $('<td></td>');
                if (this.rows[i].isRoot(this.roots[j].value)){
                    $tdata.addClass('pssc_isroot');
                }
                $trow.append($tdata);
            }
            $trow.append('<td></td>');
            $tbody.append($trow);
        }
        for (var i = 0; i < this.total.length; i++){
            var $trow = $('<tr class="pssc_total"></tr>');
            $trow.append('<td class="pssc_total"><span class="mathquill">'+this.total[i].func+'</span></td>');
            for (var j = 0; j < this.roots.length; j++){
                $trow.append('<td></td>');
            }
            $trow.append('<td></td>');
        }
        $tbody.append($trow);
        this.place.find('.mathquill').mathquill();
        var $schart = this.place.find('.pssc_tablewrapper');
        $schart.find('.pssc_rootlabel').remove();
        var $tdelem = $tbody.find('tr:eq(0) td:eq(0)');
        var xpos = $tdelem.outerWidth();
        for (var i = 0; i < this.roots.length; i++){
            $tdelem = $tdelem.next('td');
            xpos = xpos + $tdelem.outerWidth();
            $schart.append('<div class="pssc_rootlabel" style="left:'+xpos+'px;"><span class="mathquill">'+this.roots[i].label+'</span></div>');
        }
        this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();
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
    
    Pssignchart.prototype.addFunc = function(options){
        // Add a new function on a new row.
        options = $.extend({
            func: '',
            roots: []
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
        this.draw();
        return this;
    }
    
    Pssignchart.prototype.addTotal = function(options){
        this.total = [{func: options.func}];
        this.draw();
        return this;
    }
    
    Pssignchart.prototype.getData = function(options){
        var data = {rows: [], total: {func: "", signs: []}};
        for (var i=0; i<this.rows.length; i++){
            data.rows.push(this.rows[i].getData());
        }
        data.total.func = this.total[0].func;
        options.result = data;
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
        return this;
    }
    
        
    
    Pssignchart.strings = {
        style: '.pssc_default {min-height: 2em; background-color: white; padding: 15px; border: 1px solid black; border-radius: 15px; box-shadow: 5px 5px 5px rgba(0,0,0,0.5); margin: 1em 0; text-align: center;'
            + 'background: rgb(254,255,232); /* Old browsers */ background: -moz-linear-gradient(top,  rgba(254,255,232,1) 0%, rgba(214,219,191,1) 100%); /* FF3.6+ */'
            +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(254,255,232,1)), color-stop(100%,rgba(214,219,191,1))); /* Chrome,Safari4+ */'
            +'background: -webkit-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Chrome10+,Safari5.1+ */'
            +'background: -o-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Opera 11.10+ */'
            +'background: -ms-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* IE10+ */'
            +'background: linear-gradient(to bottom,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* W3C */'
            +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#feffe8", endColorstr="#d6dbbf",GradientType=0 ); /* IE6-9 */}'
            +'.pssc_default table.pssc_table {border-collapse: collapse; border: 1px solid black; margin: 0.2em auto;}'
            +'table.pssc_table tr:nth-child(even) td {background-color: #dfb;}'
            +'table.pssc_table tr:nth-child(odd) td {background-color: white;}'
            +'table.pssc_table tr.pssc_total {border-top: 2px solid black;}'
            +'.pssc_tablewrapper {margin: 0 auto; padding-top: 1.5em; position: relative; display: inline-block; text-align: left;}'
            +'.pssc_rootlabel {position: absolute; top: 0; width: auto; overflow: visible; text-align: center; height: 0.5em; white-space: nowrap;}'
            +'.pssc_rootlabel > span.mathquill {display: inline-block; position: relative; left: -50%; margin-top: -1em; vertical-align: middle;}'
            +'table.pssc_table td.pssc_isroot {border-right: 2px solid black;}'
            +'table.pssc_table td {min-width: 3em; border-right: 1px dotted black; padding: 0;}'
            +'table.pssc_table td:first-child {padding: 0 1em; border-right: 1px solid black;}'
    }
    
    
    PsscRow = function(options){
        options = $.extend({
            func: '',
            roots: []
        }, options)
        this.func = options.func;
        this.roots = options.roots;
        /*
        this.roots = [];
        for (var i = 0; i < options.roots.length; i++){
            if (typeof(options.roots[i]) === 'number'){
                this.roots.push(options.roots[i]);
            } else if (typeof(options.roots[i]) === 'object'
                         && typeof(options.roots[i].label) === 'string'
                         && typeof(options.roots[i].value) === 'number'){
                this.roots.push(options.roots[i].value);
            }
        }
        */
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
    
    PsscRow.prototype.getData = function(){
        return jQuery.extend({},{func: this.func, roots: this.roots});
    }
    
    PsscRow.prototype.isRoot = function(num){
        return (this.roots.indexOf(num) > -1);
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

