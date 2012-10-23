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
            this.children('div.pssignchart').trigger(cmd, options);
            return options.result;
        }
        // Extend default settings with user given options.
        var settings = $.extend({
            width: 'auto',              // width of sign chart. Defaults to width of parent element (auto)
            color: 'red',               // highlight color
            theme: "pssc_default",      // html class for styling
            mode: 'view'
        }, options);

        // Return this so that methods of jQuery element can be chained.
        return this.each(function(){
            // Create new Pssignchart object.
            var signchart = new Pssignchart(this, settings);
            testilogit.signchart = signchart;
            // Init the signchart
            signchart.init();
        });
    }
    
    var Pssignchart = function(place, settings){
        // Constructor for Pssignchart object.
        this.settings = settings;
        this.mode = settings.mode;
        this.place = $(place);
        this.place.html('<div></div>').addClass('pssignchartwrapper');
        this.place = this.place.find('div');
        this.place.addClass('pssignchart');
        this.rows = [];
        this.roots = [];
        this.total = {func: '', signs: ['']};
        this.intervals = [];
        this.rootpoints = [];
        this.undefinedpoint = [];
        
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
        var $schart = $('<div class="pssc_tablewrapper"><table class="pssc_table"><thead class="pssc_head"><tr><td colspan="2"><div></div></td></tr></thead><tbody class="pssc_body"></tbody><tbody class="pssc_intervals"><tr></tr></tbody></table></div>');
        this.schartnumber = -1;
        while ($('#signchart_'+(++this.schartnumber)).length > 0){};
        $schart.attr('id','#signchart_'+this.schartnumber)
        this.place.empty().append($schart);
        this.draw();
        this.initEvents();
        if (this.mode === 'edit'){
            this.place.addClass('editmode');
            this.showEdit();
        } else {
            this.place.removeClass('editmode');
        }
        return this;
    }
    
    Pssignchart.prototype.draw = function(){
        // Draw the signchart
        var signchart = this;
        var $thead = this.place.find('thead.pssc_head');
        var $tbody = this.place.find('tbody.pssc_body');
        $tbody.empty();
        // Draw each function row.
        for (var i = 0; i < this.rows.length; i++){
            var $trow = $('<tr></tr>');
            $trow.append('<td class="pssc_func"><span class="mathquill">'+this.rows[i].func
                +'</span></td><td class="pssc_motivation" mot="'+this.getMotString(i)
                +'"><a href="javascript:;" class="motshow"><span></span></a></td>');
            // Draw each "slot" in a function row.
            for (var j = 0, rowroot = 0; j < this.roots.length; j++){
                var $tdata = $('<td class="pssc_sign" sign="'+this.getSign(i, rowroot)+'" rootnum="'+rowroot+'"><a href="javascript:;"></a></td>');
                if (this.rows[i].isRoot(this.roots[j])){
                    $tdata.addClass('pssc_isroot');
                    rowroot++;
                }
                $trow.append($tdata);
            }
            $trow.append('<td class="pssc_sign" sign="'+this.getSign(i, rowroot)+'" rootnum="'+rowroot+'"><a href="javascript:;"></a></td>');
            $tbody.append($trow);
        }
        // Draw the total row.
        var $trow = $('<tr class="pssc_total"></tr>');
        $trow.append('<td colspan="2" class="pssc_total"><span class="mathquill">'+this.total.func+'</span></td>');
        for (var j = 0; j < this.roots.length; j++){
            var thisundefined = (this.undefinedpoint[j] ? ' isundefined': '');
            $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(j)+'" rootnum="'+j+'"><div class="pssc_totalwrapper"><a href="javascript:;" class="pssc_totalsign"></a><a href="javascript:;" class="pssc_totalundefined'+thisundefined+'"></a></div></td>');
        }
        $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(this.roots.length)+'" rootnum="'+this.roots.length+'"><a href="javascript:;" class="pssc_totalsign"></a></td>');

        $tbody.append($trow);
        // Function on total row is editable, if in edit-mode.
        if (this.mode === 'edit'){
            $tbody.find('tr.pssc_total td span.mathquill').addClass('mathquill-editable');
        }
        this.place.find('.mathquill-editable:not(.mathquill-rendered-math)').mathquill('editable');
        this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();

        // Add intervals
        var intervalhtml = '<td colspan="2"></td>';
        for (var i = 0; i < this.roots.length; i++){
            intervalhtml += '<td class="pssc_interval"><span><a href="javascript:;" class="pssc_intervalline" intervaltype="'
                +this.getInterval(i)+'"></a><a href="javascript:;" class="pssc_rootpoint" pointtype="'
                +this.getRootpoint(i)+'"></a></span></td>';
        }
        intervalhtml += '<td class="pssc_interval"><span><a href="javascript:;" class="pssc_intervalline" intervaltype="'
            +this.getInterval(this.roots.length)+'"></a></span></td>';
        this.place.find('table.pssc_table tbody.pssc_intervals tr').html(intervalhtml);

        // Add labels for roots.
        $thead.empty().append('<tr><td colspan="2"><div></div></td></tr>');
        $thtr = $thead.find('tr');
        for (var i = 0; i < this.roots.length; i++){
            $thtr.append('<td class="pssc_headrootlabel"><div class="pssc_rootlabel"><span class="mathquill">'+this.roots[i].label+'</span></div></td>');
        }
        this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();

        // If in editmode, init all actions.
        if (this.mode === 'edit'){
            this.initEdit();
        }
    }
    
    Pssignchart.prototype.initEdit = function(){
        // Init editing events of the signchart
        var signchart = this;
        var $tbody = this.place.find('tbody.pssc_body');
        
        // Init clicks for motivations.
        $tbody.find('td.pssc_motivation a').click(function(){
            var $motlink = $(this);
            if (!$motlink.hasClass('isopen')){
                $motlink.addClass('isopen');
                var $tdmot = $motlink.parent('td');
                var rownum = $tdmot.parents('tbody').find('tr').index($tdmot.parents('tr').eq(0));
                signchart.changeMotivation($tdmot, rownum);
            }
        });
        
        // Init sign clicks for plus, minus and none.
        $tbody.find('td.pssc_sign').click(function(){
            var $tdsign = $(this);
            $tdsign.trigger('pssc_signchange');
        });
        
        // Init sign clicks for plus, minus and none.
        $tbody.find('td.pssc_sign').bind('pssc_signchange', function(){
            var $td = $(this);
            var rownum = $td.parents('tbody').find('tr').index($td.parents('tr').eq(0));
            var rootnum = parseInt($td.attr('rootnum'));
            var istotal = $td.parents('tr').eq(0).hasClass('pssc_total');
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
            $td.parent('tr').find('td[rootnum="'+rootnum+'"]').attr('sign', newsign);
            if (istotal){
                signchart.setTotalSign(rootnum, newsign);
            } else {
                signchart.setSign(rownum, rootnum, newsign);
            }
        });
        
        // Init focus highlights for signs.
        $tbody.find('td.pssc_sign a.pssc_totalsign').focus(function(){
            $(this).parent().addClass('focushere');
        }).blur(function(){
            $(this).parent().removeClass('focushere');
        });
        
        // Init clicks for undefined points.
        $tbody.find('td.pssc_sign a.pssc_totalundefined').click(function(){
            var $thistd = $(this).parents('td');
            var index = $thistd.parent('tr').find('td').index($thistd) -1;
            var height=$thistd.eq(0).height();
            $(this).toggleClass('isundefined').css({'height': height + 'px', 'top': -9-(height/2)+'px'});
            signchart.setUndef(index ,$(this).hasClass('isundefined'));
            return false;
        });
        
        // Init clicks for rootpoints
        this.place.find('tbody.pssc_intervals a.pssc_rootpoint').click(function(){
            var $td = $(this).parents('td').eq(0);
            var $alltds = $td.parents('tr').eq(0).children('td');
            var rootindex = $alltds.index($td) - 1;
            var pointtype = $(this).attr('pointtype');
            switch (pointtype){
                case 'open':
                    $(this).attr('pointtype','closed');
                    signchart.setRootpoint(rootindex, 'closed');
                    break;
                case 'closed':
                    $(this).attr('pointtype','');
                    signchart.setRootpoint(rootindex, '');
                    break;
                default:
                    $(this).attr('pointtype','open');
                    signchart.setRootpoint(rootindex, 'open');
            }
        });
        
        // Init clicks for intervallines
        this.place.find('tbody.pssc_intervals a.pssc_intervalline').click(function(){
            var $td = $(this).parents('td').eq(0);
            var $alltds = $td.parents('tr').eq(0).children('td');
            var intindex = $alltds.index($td) - 1;
            var intervaltype = $(this).attr('intervaltype');
            switch (intervaltype){
                case 'inside':
                    $(this).attr('intervaltype','');
                    signchart.setInterval(intindex, '');
                    break;
                default:
                    $(this).attr('intervaltype','inside');
                    signchart.setInterval(intindex, 'inside');
            }
        });
        
        // Init focusout for function on total row.
        this.place.find('tbody.pssc_body tr.pssc_total td.pssc_total span.mathquill-editable').focusout(function(){
            signchart.total.func = $(this).mathquill('latex');
            signchart.changed();
        });
    }
    
    Pssignchart.prototype.showEdit = function(){
        // Shows buttons for adding and removing functions.
        var signchart = this;
        this.place.prepend('<div class="pssc_toolbarwrapper"><ul class="pssc_toolbar"><li><a href="javascript:;" class="addrow"><span></span></a></li><li><a href="javascript:;" class="removerow"><span></span></a></li></ul></div>');
        this.toolbar = this.place.find('.pssc_toolbarwrapper');
        this.toolbar.find('a.addrow').click(function(){
            var $tool = $(this);
            if ($tool.hasClass('isopen')){
                $tool.removeClass('isopen');
                signchart.toolbar.find('.pssc_addrowbox').fadeOut(300, function(){$(this).remove();});
            } else {
                $tool.parents('ul').eq(0).find('a.isopen').click();
                $tool.addClass('isopen');
                signchart.toolbar.append('<div class="pssc_addrowbox pssc_bggrad">'
                    +'<span class="pssc_newfunc_title">f:</span><span class="mathquill-editable pssc_newfunc"></span>'
                    +'<div class="pssc_newroots" roots="0"><a href="javascript:;" class="pssc_newroots_title pssc_bggrad">0</a><span class="mathquill-editable pssc_newroot1"></span><span class="mathquill-editable pssc_newroot2"></span></div><a href="javascript:;" class="pssc_addfuncbutton">+</a></div>');
                signchart.toolbar.find('.pssc_addrowbox').hide().fadeIn(300, function(){$(this).find('.mathquill-editable:not(.mathquill-rendered-math)').mathquill('editable').eq(0).focus();});
                signchart.toolbar.find('.pssc_addrowbox .pssc_newroots_title').click(function(){
                    var $newroots = $(this).parents('.pssc_newroots');
                    var amount = parseInt($newroots.attr('roots'));
                    amount = (amount + 1) % 3;
                    $newroots.attr('roots', amount);
                    $(this).html(amount);
                });
                signchart.toolbar.find('a.pssc_addfuncbutton').click(function(){
                    var numofroots = parseInt($(this).parent().find('.pssc_newroots').attr('roots'));
                    var newfunc = signchart.toolbar.find('.pssc_newfunc').mathquill('latex');
                    var newroot = [];
                    var newrootval = [];
                    var rootsok = true;
                    var rootlist = [];
                    for (var i = 0; i < numofroots; i++){
                        newroot[i] = signchart.toolbar.find('.pssc_newroot'+(i+1)).mathquill('latex');
                        try {
                            newrootval[i] = latexeval(newroot[i]);
                            rootsok = rootsok && (typeof(newrootval[i]) === 'number');
                            rootlist.push({label: newroot[i], value: newrootval[i]});
                        } catch (err){
                            if (err === 'Invalidexpression'){
                                signchart.toolbar.find('.pssc_newroot'+(i+1)).addClass('inputerror').focus().delay(2000).queue(function(){$(this).removeClass('inputerror');$(this).dequeue();});
                                rootsok = false;
                            }
                        }
                    }
                    if (rootsok){
                        signchart.place.trigger('add', {func: newfunc, roots: rootlist});
                        signchart.toolbar.find('.pssc_newfunc').mathquill('latex','').focus();
                        signchart.toolbar.find('.pssc_newroot1').mathquill('latex','');
                        signchart.toolbar.find('.pssc_newroot2').mathquill('latex','');
                    }
                });
            }
        });
        this.toolbar.find('a.removerow').click(function(){
            var $tool = $(this);
            if ($tool.hasClass('isopen')){
                $tool.removeClass('isopen');
                signchart.place.find('td.pssc_func a.pssc_removerow_button').remove();
            } else {
                $tool.parents('ul').eq(0).find('a.isopen').click();
                $tool.addClass('isopen');
                signchart.place.find('td.pssc_func')
                    .prepend('<a href="javascript:;" class="pssc_removerow_button pssc_bggrad"><span></span></a>')
                    .find('a.pssc_removerow_button')
                    .click(function(){
                        var $thisbutton = $(this);
                        var $thisfunc = $thisbutton.parents('td.pssc_func');
                        var $allfunc = $thisfunc.parents('tbody').find('td.pssc_func');
                        var index = $allfunc.index($thisfunc);
                        signchart.removeFunc(index);
                        signchart.place.find('.pssc_toolbar a.removerow.isopen').click().click();
                    });
            }
        });
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
    
    Pssignchart.prototype.changeMotivation = function($tdelem, rownum){
        var signchart = this;
        var menuhtml = '<div class="motivationselectwrapper"><ul class="motivationselector">';
        for (var i = 0; i < Pssignchart.mot.length; i++){
            menuhtml += '<li><a href="javascript:;" mot="'+Pssignchart.mot[i]+'"><span></span></a></li>';
        }
        menuhtml += '</ul></div>';
        $tdelem.append(menuhtml).find('.motivationselectwrapper ul.motivationselector').hide().fadeIn(600);
        $tdelem.find('ul.motivationselector a').click(function(){
            var newmot = $(this).attr('mot');
            $tdelem.attr('mot', newmot);
            signchart.setMotString(rownum, newmot);
            $(this).parents('.motivationselectwrapper').find('ul.motivationselector').fadeOut(600, function(){$(this).remove()});
            $tdelem.find('a.motshow').removeClass('isopen');
        });
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
        this.changed();
        return this;
    }
    
    Pssignchart.prototype.removeFunc = function(index){
        // Remove a function.
        this.rows.splice(index, 1);
        this.refreshRoots();
        this.draw();
        this.changed();
    }
    
    Pssignchart.prototype.refreshRoots = function(){
        // Rebuild roots-list.
        this.roots = [];
        for (var i = 0; i < this.rows.length; i++){
            for (var j = 0; j < this.rows[i].roots.length; j++){
                if (!this.isInRoots(this.rows[i].roots[j])){
                    this.roots.push(this.rows[i].roots[j]);
                }
            }
        }
        this.roots.sort(function(a,b){return (a.value < b.value ? -1 : 1)});
    }
    
    Pssignchart.prototype.addTotal = function(options, nodraw){
        options.func = options.func || '';
        options.signs = options.signs || this.total.signs || [];
        this.total = {func: options.func, signs: options.signs};
        if (!nodraw){
            this.draw();
        }
        this.changed();
        return this;
    }
    
    Pssignchart.prototype.setMot = function(row, mot){
        this.rows[row].setMotivation(mot);
    }
    
    Pssignchart.prototype.getMot = function(row){
        return this.rows[row].getMotivation() || 0;
    }
    
    Pssignchart.prototype.setMotString = function(row, motstring){
        var mot = Pssignchart.mot.indexOf(motstring);
        mot = (mot > -1) ? mot : 0;
        this.setMot(row, mot);
        this.changed();
    }
    
    Pssignchart.prototype.getMotString = function(row){
        return Pssignchart.mot[this.getMot(row)];
    }
    
    Pssignchart.prototype.setSign = function(row, col, sign){
        if (sign !== 'plus' && sign !== 'minus'){
            return false;
        }
        this.rows[row].setSign(col, sign);
        this.changed();
    }
    
    Pssignchart.prototype.getSign = function(row, col){
        return this.rows[row].getSign(col) || '';
    }
    
    Pssignchart.prototype.setTotalSign = function(col, sign){
        this.total.signs[col] = sign;
        this.changed();
    }
    
    Pssignchart.prototype.getTotalSign = function(col){
        return this.total.signs[col] || '';
    }
    
    Pssignchart.prototype.setInterval = function(n, onoff){
        onoff = (onoff ? 'inside':'');
        if (n < 0 || n > this.roots.length -1){
            return false;
        }
        this.intervals[n] = onoff;
        this.changed();
        return this.intervals[n];
    }
    
    Pssignchart.prototype.getInterval = function(n){
        return this.intervals[n] || '';
    }
    
    Pssignchart.prototype.setRootpoint = function(n, onoff){
        if (n < 0 || n > this.roots.length -1 || (onoff !== 'closed' && onoff !== 'open' && onoff !== '')){
            return false;
        }
        this.rootpoints[n] = onoff;
        this.changed();
        return this.rootpoints[n];
    }
    
    Pssignchart.prototype.getRootpoint = function(n){
        return this.rootpoints[n] || '';
    }
    
    Pssignchart.prototype.setUndef = function(index, onoff){
        if (index < 0 || index > this.roots.length -1){
            return false;
        }
        this.undefinedpoint[index] = onoff;
        this.changed();
        return this.undefinedpoint[index];
    }
    
    Pssignchart.prototype.getUndef = function(index){
        return this.undefinedpoint[index] || '';
    }
    
    Pssignchart.prototype.getData = function(options){
        var data = {rows: [], total: {func: "", signs: []}, intervals: [], rootpoints: [], undefinedpoint: []};
        for (var i=0; i<this.rows.length; i++){
            data.rows.push(this.rows[i].getData());
        }
        data.total.func = this.total.func;
        data.total.signs = this.total.signs;
        data.intervals = this.intervals.slice(0);
        data.rootpoints = this.rootpoints.slice(0);
        data.undefinedpoint = this.undefinedpoint.slice(0);
        options.result = data;
    }
    
    Pssignchart.prototype.setData = function(options){
        this.empty();
        for (var i = 0; i < options.rows.length; i++){
            this.addFunc(options.rows[i], true);
        }
        this.addTotal(options.total, true);
        this.intervals = options.intervals.slice(0);
        this.rootpoints = options.rootpoints.slice(0);
        this.undefinedpoint = options.undefinedpoint.slice(0);
        this.draw();
        this.changed();
    }
    
    Pssignchart.prototype.empty = function(){
        this.rows = [];
        this.roots = [];
        this.total = {func: '', signs: ['']};
        this.intervals = [];
        this.rootpoints = [];
        this.draw();
        this.changed();
    }
    
    Pssignchart.prototype.changed = function(){
        this.place.trigger('pssc_changed');
    }
    
    Pssignchart.prototype.initEvents = function(){
        var schart = this;
        this.place.bind('add', function(e, options){
            schart.addFunc(options);
        });

        this.place.bind('total', function(e, options){
            schart.addTotal(options);
        });

        this.place.bind('setsign', function(e, options){
            schart.setSign(options.row, options.col, options.sign);
            schart.draw();
        });

        this.place.bind('settotsign', function(e, options){
            schart.setTotalSign(options.col, options.sign);
            schart.draw();
        });

        this.place.bind('setinterval', function(e, options){
            schart.setInterval(options.col, options.onoff);
            schart.draw();
        });

        this.place.bind('setrootpoint', function(e, options){
            schart.setRootpoint(options.col, options.onoff);
            schart.draw();
        });

        this.place.bind('setundef', function(e, options){
            schart.setUndef(options.col, options.onoff);
            schart.draw();
        });

        this.place.bind('setmot', function(e, options){
            schart.setMotString(options.row, options.mot);
            schart.draw();
        });

        this.place.bind('get', function(e, options){
            return schart.getData(options);
        });
        
        this.place.bind('set', function(e, options){
            schart.setData(options);
            schart.draw();
        })
        
        this.place.bind('empty', function(e, options){
            schart.empty();
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
            '.pssc_default {min-height: 2em; background-color: white; padding: 15px; border: 1px solid black; border-radius: 15px; box-shadow: 5px 5px 5px rgba(0,0,0,0.5); margin: 1em 0; text-align: center;}'
            +'.pssc_default {background: rgb(254,255,232); /* Old browsers */ background: -moz-linear-gradient(top,  rgba(254,255,232,1) 0%, rgba(214,219,191,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(254,255,232,1)), color-stop(100%,rgba(214,219,191,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#feffe8", endColorstr="#d6dbbf",GradientType=0 ); /* IE6-9 */}'
            +'.pssignchart .pssc_tablewrapper {clear: both;}'
            +'.pssc_default table.pssc_table {border-collapse: collapse; margin: 0.2em auto;}'
            +'.pssignchartwrapper {text-align: center;}'
            +'.pssignchart {position: relative; display: inline-block; text-align: left; min-height: 70px;}'
            +'.pssignchart.editmode {margin-bottom: 2em; padding-left: 70px;}'
            +'.pssc_default table.pssc_table tbody.pssc_body {border: 1px solid black;}'
            +'table.pssc_table tr:nth-child(even) td {background-color: #eef;/*#dfb;*/}'
            +'table.pssc_table tr:nth-child(odd) td {background-color: white;}'
            +'table.pssc_table tr.pssc_total {border-top: 4px solid black;}'
            +'.pssc_tablewrapper {margin: 0 auto; position: relative; display: inline-block; text-align: left;}'
            +'table.pssc_table .pssc_head td div {min-height: 1em;}'
            +'td.pssc_headrootlabel {text-align: right;}'
            +'td.pssc_headrootlabel .pssc_rootlabel {text-align: left; display: inline-block;}'
            +'.pssc_rootlabel {position: relative; overflow: visible; text-align: center; white-space: nowrap; padding-bottom: 0.5em;}'
            +'.pssc_rootlabel > span.mathquill {display: inline-block; position: relative; right: -50%; margin-top: -1em; vertical-align: bottom; white-space: nowrap;}'
            +'table.pssc_table .pssc_body td.pssc_isroot {border-right: 3px solid black;}'
            +'table.pssc_table .pssc_body td {min-width: 3em; border-right: 1px dotted black; padding: 0;}'
            +'table.pssc_table .pssc_body td.pssc_func {padding: 0 1em; border-right: none;}'
            +'table.pssc_table .pssc_body td.pssc_motivation {padding: 0 1em; border-right: 1px solid black; cursor: pointer; padding: 0;}'
            +'table.pssc_table .pssc_body td.pssc_motivation a span {width: 30px; height: 20px; display: block; margin: 0 auto;}'
            +'table.pssc_table .pssc_body td.pssc_motivation a {text-align: center; display: block; border: 1px solid #777; border-radius: 4px; margin: 0;}'
            +'.pssc_default, table.pssc_table td.pssc_motivation a, .pssignchart .pssc_toolbar li a, .pssignchart .pssc_addfuncbutton, .pssc_bggrad  {'
                +'background: rgb(255,255,255); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(255,255,255,1) 0%, rgba(246,246,246,1) 47%, rgba(237,237,237,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(255,255,255,1)), color-stop(47%,rgba(246,246,246,1)), color-stop(100%,rgba(237,237,237,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#ffffff", endColorstr="#ededed",GradientType=0 ); /* IE6-9 */}'
            +'table.pssc_table td.pssc_total {padding: 0 1em; border-right: 1px solid black;}'
            +'table.pssc_table td.pssc_motivation[mot="linear-asc"] a.motshow span, ul.motivationselector a[mot="linear-asc"] span '
                +'{background-image: url(images/linear-asc.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="linear-desc"] a.motshow span, ul.motivationselector a[mot="linear-desc"] span '
                +'{background-image: url(images/linear-desc.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-0"] a.motshow span, ul.motivationselector a[mot="parab-up-0"] span '
                +'{background-image: url(images/parab-up-0.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-1"] a.motshow span, ul.motivationselector a[mot="parab-up-1"] span '
                +'{background-image: url(images/parab-up-1.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-up-2"] a.motshow span, ul.motivationselector a[mot="parab-up-2"] span '
                +'{background-image: url(images/parab-up-2.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-0"] a.motshow span, ul.motivationselector a[mot="parab-down-0"] span '
                +'{background-image: url(images/parab-down-0.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-1"] a.motshow span, ul.motivationselector a[mot="parab-down-1"] span '
                +'{background-image: url(images/parab-down-1.png); background-position: center center; background-repeat: no-repeat;}'
            +'table.pssc_table td.pssc_motivation[mot="parab-down-2"] a.motshow span, ul.motivationselector a[mot="parab-down-2"] span '
                +'{background-image: url(images/parab-down-2.png); background-position: center center; background-repeat: no-repeat;}'
            +'.motivationselectwrapper {position: relative;}'
            +'.motivationselectwrapper ul.motivationselector {position: absolute; top: -25px; left: -6px; list-style: none; margin: 0; padding: 2px; width: 102px; background-color: #eee;'
                +'border: 1px solid #777; border-radius: 4px; box-shadow: 4px 4px 4px rgba(0,0,0,0.5); z-index: 10;}'
            +'.motivationselectwrapper ul.motivationselector li {display: inline-block; margin: 1px; padding: 0; vertical-align: top;}'
            +'.motivationselectwrapper ul.motivationselector li a {width: 30px; height: 20px; margin: 0; padding: 0; display: block;}'
            +'table.pssc_table td.pssc_sign {cursor: pointer; text-align: center; min-width: 50px; width: 50px;}'
            +'table.pssc_table td.pssc_sign[sign=""]:before {content: "\\0000a0";}'
            +'table.pssc_table td.pssc_sign[sign="plus"]:before {content: "+"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black; margin: 0 7px;}'
            +'table.pssc_table td.pssc_sign[sign="plus"] {background: rgb(248,80,50); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(248,80,50,1) 0%, rgba(241,111,92,1) 50%, rgba(246,41,12,1) 51%, rgba(240,47,23,1) 71%, rgba(231,56,39,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(248,80,50,1)), color-stop(50%,rgba(241,111,92,1)), color-stop(51%,rgba(246,41,12,1)), color-stop(71%,rgba(240,47,23,1)), color-stop(100%,rgba(231,56,39,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#f85032", endColorstr="#e73827",GradientType=0 ); /* IE6-9 */}'
            +'table.pssc_table td.pssc_sign[sign="minus"]:before {content: "\u2014"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black; margin: 0 7px;}'
            +'table.pssc_table td.pssc_sign[sign="minus"] {background: rgb(183,222,237); /* Old browsers */'
                +'background: -moz-linear-gradient(top,  rgba(183,222,237,1) 0%, rgba(113,206,239,1) 50%, rgba(33,180,226,1) 51%, rgba(183,222,237,1) 100%); /* FF3.6+ */'
                +'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(183,222,237,1)), color-stop(50%,rgba(113,206,239,1)), color-stop(51%,rgba(33,180,226,1)), color-stop(100%,rgba(183,222,237,1))); /* Chrome,Safari4+ */'
                +'background: -webkit-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Chrome10+,Safari5.1+ */'
                +'background: -o-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Opera 11.10+ */'
                +'background: -ms-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* IE10+ */'
                +'background: linear-gradient(to bottom,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* W3C */'
                +'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#b7deed", endColorstr="#b7deed",GradientType=0 ); /* IE6-9 */}'
            +'table.pssc_table .focushere {box-shadow: 2px 2px 1px green, -2px -2px 1px green, 2px -2px 1px green, -2px 2px 1px green;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals {border: none; background-color: transparent;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td {border: none; background-color: transparent; height: 1em;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval {border-bottom: 1px dotted #777; vertical-align: bottom;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span {display: block; margin: 0; padding: 0; position: relative;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span a.pssc_rootpoint {display: inline-block; position: absolute; width: 8px; height: 8px; right: -5px; bottom: -6px; border: 1px solid #bbb; border-radius: 5px; z-index: 5;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span a.pssc_rootpoint[pointtype="open"] {border: 2px solid red; background-color: white;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span a.pssc_rootpoint[pointtype="closed"] {border: 1px solid red; background-color: red;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span a.pssc_intervalline {display: block; height: 4px; position: absolute; left: 0; right: 0; bottom: -3px;}'
            +'.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span a.pssc_intervalline[intervaltype="inside"] {border-bottom: 4px solid red;}'
            +'.pssignchart .pssc_toolbarwrapper {text-align: left; margin: 0; position: relative;}'
            +'.pssignchart ul.pssc_toolbar {list-style: none; margin: 0; padding: 0; position: absolute; top: 20px; left: -60px;}'
            +'.pssignchart ul.pssc_toolbar li {margin: 0.3em 0; padding: 0; display: block;}'
            +'.pssignchart ul.pssc_toolbar li a {display: block; border: 1px solid #777; border-radius: 4px; height: 20px; width: 20px;}'
            +'.pssignchart ul.pssc_toolbar li a.isopen {border-color: red;}'
            +'.pssignchart a.addrow span {display: block; height: 20px; width: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJOgAACToB8GSSSgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFgSURBVDiNzVQxSMNAFH3/0rRm6yjiUlwCHcRN54Kbgzi4BFSos3RxtNTRpTgrqJBVHNwEZ93EoZBFXEQcC0Vi7pr7DpWmSe1VSwUf3HL337v//juOmBnThJiq2l8I5sYVHF0sVphjDwCILH9/6/HWVE+mGTbOl4qWVK8AO1/lYZy35+rbD+1RHLPlTuQqGTtKavRW7KATuSaK0bJSgEbagQAZexiyXGuUisLJuQAgYpSZ6DRDqGoLLQDQYTdo1p/bmfNEcO9woQLQNQDH2EaCEOC144OnflApy1LCo34AP4LDgAfge0El9ZgJDSP7RlKC3Uj7INrEbywz+4MbQ6Hs1EpFFSkXAJioDE6HAuIqMbcAwC7YwVnTEEoWG7vzy4JxN7inCSuXJy/3ozjmdxgCQqQv1No8ZaOg9W4HsvARIplpmI9mAhPHaBkAVtdnKxDs9doj/+bqbfLPYRL8/w/2E7FJjqbuDTz5AAAAAElFTkSuQmCC) center center no-repeat;}'
            +'.pssignchart a.removerow span {display: block; height: 20px; width: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJOgAACToB8GSSSgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACOSURBVDiN7ZMhDsJQEETfNBhsD1GB4wzVSILp8eoq0ZwBV9FD4ADHYBC/TUt+0y8qOnKy+7Kb2ZVtUipLStuA6wTuhkYr5YIiptnQHexH6Cm8w7tUAldgHznQGzgd7dvohC+oZsD41VbAJHCxesAn1IILM1Y21KGh4S83Uv6JDCWD7vwvlBRa/2FvwOX6AlldJihgfCAkAAAAAElFTkSuQmCC) center center no-repeat;}'
            +'.pssignchart .pssc_toolbarwrapper .pssc_addrowbox {position: absolute; border: 1px solid black; border-radius: 0.5em; box-shadow: 4px 4px 4px rgba(0,0,0,0.5); padding: 0.5em; z-index: 10; background-color: #fefefe; margin-bottom: 0; margin-left: -10px; white-space: nowrap;}'
            +'.pssignchart .pssc_newfunc_title {font-style: italic; margin-left: 1em;}'
            +'.pssignchart .pssc_newroots_title {display: inline-block; width: 1.5em; height: 1.5em; border: 1px solid #777; border-radius: 4px; text-align: center; text-decoration: none; font-weight: bold; color: black;}'
            +'.pssignchart .pssc_toolbarwrapper .pssc_newfunc {display: inline-block; min-width: 5em; min-height: 1.3em; margin: 0 1em; vertical-align: bottom;}'
            +'.pssignchart .pssc_toolbarwrapper .pssc_newroots, .pssignchart .pssc_toolbarwrapper .pssc_newroot1, .pssignchart .pssc_toolbarwrapper .pssc_newroot2 {display: inline-block; min-width: 4em; min-height: 1.3em; margin: 0 0.5em;}'
            +'.pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="0"] .pssc_newroot1, .pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="0"] .pssc_newroot2, .pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="1"] .pssc_newroot2 {display: none;}'
            +'.pssignchart .pssc_addfuncbutton {border: 1px solid #777; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; text-align: center; width: 1.5em; height: 1.5em; padding: 0; margin: 0.2em; vertical-align: top;}'
            +'.pssignchart span.mathquill-editable.inputerror {background-color: #faa;}'
            +'.pssignchart span.mathquill-editable {background-color: white;}'
            +'.pssignchart .pssc_totalwrapper {position: relative;}'
            +'.pssc_totalwrapper .pssc_totalundefined {position: absolute; left: 47px; top: -2em; width: 9px; height: 3em; background-color: transparent;}'
            +'.pssc_totalwrapper .pssc_totalundefined:hover {background-color: rgba(255,255,255,0.8);}'
            +'.pssc_totalwrapper .pssc_totalundefined.isundefined {background: rgba(255,255,255,0.5) url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAGCAYAAAARx7TFAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAEJwAABCcB2U8dgAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABESURBVAiZjc6xDYBADAPAC12moqb9ghlZg2kYIzSP9AVFLFkubNmOqrIiIhIHTuy4zVBi4MIzdSC/kl9j5aaDzlx0jr/6Nimp6cXzJwAAAABJRU5ErkJggg==) center top repeat-y;}'
            +'a.pssc_removerow_button {display: block; width: 15px; height: 15px; margin-left: -40px; border: 1px solid #777; border-radius: 4px; position: absolute;}'
            +'a.pssc_removerow_button span {display: block; width: 15px; height: 15px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAG7AAABuwBHnU4NQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACASURBVCiR1ZIxDoJQEETfEDgB8Q7W9DRWtp6U1oqGnpo7EBssf8JYKAkEUfOtmG6SeZndzco2sUqiyf3C6dx0Uh7gsBXOoD/at8lrunYrnQzXZ2ZTQXAu7HrRPED5BXyVUwJL+A6NIfzQ3KzGBqikfPywcwL95d3OMdrpk/wFPwCoMCa9FLMcVQAAAABJRU5ErkJggg==) center center no-repeat;}'
    }
    

    /******************************************
     * Row of signchart
     ******************************************/
    var PsscRow = function(options){
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
    

    
    /*******************************************
     * Root on a row of signchart
     *******************************************/
    var PsscRoot = function(options){
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


    var latexeval = function(expression){
        var latexrep = [
            [/\\sqrt{([^{}]*)}/ig, 'sqrt($1)'],
            [/\\frac{([^{}]*)}{([^{}]*)}/ig, '(($1)/($2))'],
            [/((?:[0-9]+)|(?:\([^\(\)]\)))\^((?:[0-9])|(?:{[0-9]+}))/ig, 'pow($1, $2)']
        ]
        var reponce = [
            [/\\left\(/ig, '('],
            [/\\right\)/ig, ')'],
            [/\)\(/ig, ')*('],
            [/\\cdot/ig, '*']
        ]
        var oldexpr = '';
        while (oldexpr !== expression){
            oldexpr = expression;
            for (var i = 0; i < latexrep.length; i++){
                expression = expression.replace(latexrep[i][0], latexrep[i][1]);
            }
        }
        for (var i = 0; i < reponce.length; i++){
            expression = expression.replace(reponce[i][0], reponce[i][1]);
        }
        var reg = /(?:[a-z$_][a-z0-9$_]*)|(?:[;={}\[\]"'!&<>^\\?:])/ig,
            valid = true;
        expression = expression.replace(reg, function(word){
            if (Math.hasOwnProperty(word)){
                return 'Math.'+word;
            } else {
                valid = false;
                return word;
            }
        });
        if (!valid){
            alert('Invalid expression!');
        } else {
            try {
                return (new Function('return ('+expression+')'))();
            } catch (err) {
                throw 'Invalidexpression';
            }
        }
    }
    
})(jQuery)

