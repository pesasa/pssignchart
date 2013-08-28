/*********************************************************
 * jquery.pssignchart.js
 * jQuery-plugin for creating a sign chart
 * Petri Salmela
 * pesasa@iki.fi
 * 15.08.2012
 *
 * License: GNU LGPL or WTFPL
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
            mode: 'view',
            caption: ''
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
        this.caption = this.settings.caption;
        this.place = $(place);
        this.place.html('<div></div>').addClass('pssignchartwrapper');
        this.place = this.place.find('div');
        this.place.addClass('pssignchart');
        this.rows = [];
        this.roots = [];
        this.total = {func: '', signs: [''], relation: '\\lt'};
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
        var $schart = $('<div class="pssc_tablewrapper"><table class="pssc_table"><caption>'+this.caption+'</caption><thead class="pssc_head"><tr><td colspan="2"><div></div></td></tr></thead><tbody class="pssc_body"></tbody><tbody class="pssc_intervals"><tr></tr></tbody></table></div>');
        this.schartnumber = -1;
        while ($('#signchart_'+(++this.schartnumber)).length > 0){};
        $schart.attr('id','#signchart_'+this.schartnumber)
        this.place.empty().append($schart);
        this.captionelem = $schart.find('caption');
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
        if (this.mode === 'edit') {
            this.captionelem.html('<span class="editablecaption mathquill-textbox">'+this.caption+'</span>').find('.editablecaption:not(.mathquill-rendered-math)').mathquill('textbox');
        } else {
            this.captionelem.html(this.caption.replace(/\$([^$]*)\$/g, '<span class="mathquill-embedded-latex">$1</span>')).find('.mathquill-embedded-latex:not(.mathquill-rendered-math)').mathquill();
        }
        var $thead = this.place.find('thead.pssc_head');
        var $tbody = this.place.find('tbody.pssc_body');
        $tbody.empty();
        // Draw each function row.
        for (var i = 0; i < this.rows.length; i++){
            if (this.mode === 'view') {
                this.viewRow($tbody, i);
            } else {
                this.editRow($tbody, i);
            }
        }
        if (this.rows.length > 1){
            // Draw the total row.
            var $trow = $('<tr class="pssc_total"></tr>');
            $trow.append('<td colspan="2" class="pssc_total"><span class="mathquill">'+this.total.func+'</span></td>');
                var thisundefined = (this.undefinedpoint[j] ? ' isundefined': '');
                if (this.mode === 'edit') {
                    $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(j)+'" rootnum="'+j+'"><div class="pssc_totalwrapper"><a href="javascript:;" class="pssc_totalsign"></a><a href="javascript:;" class="pssc_totalundefined'+thisundefined+'"></a></div></td>');
                } else {
                    $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(j)+'" rootnum="'+j+'"><div class="pssc_totalwrapper"><span class="pssc_totalsign"></span><span class="pssc_totalundefined'+thisundefined+'"></span></div></td>');
                }
                
            }
            if (this.mode === 'edit') {
                $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(this.roots.length)+'" rootnum="'+this.roots.length+'"><a href="javascript:;" class="pssc_totalsign"></a></td>');
            } else {
                $trow.append('<td class="pssc_sign" sign="'+this.getTotalSign(this.roots.length)+'" rootnum="'+this.roots.length+'"><span class="pssc_totalsign"></span></td>');
            }

            $tbody.append($trow);
            // Function on total row is editable, if in edit-mode.
            if (this.mode === 'edit'){
                $tbody.find('tr.pssc_total td span.mathquill').addClass('mathquill-editable');
            }
            this.place.find('.mathquill-editable:not(.mathquill-rendered-math, .mathquill-textbox)').mathquill('editable');
            this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();
        } else if (this.rows.length === 0){
            // If there are no rows, show a symbol for empty table.
            $tbody.append('<tr class="pssc_emptytable"><td>'+Pssignchart.strings.icons.emptytable+'</td></tr>');
        }

        if (this.rows.length > 0){
            // Add intervals
            var lefthandside = (this.rows.length === 1 ? this.rows[0].func : this.total.func);
            if (this.mode === 'edit') {
                var intervalhtml = '<td colspan="2"><div class="pssc_inequality"><a href="javascript:;" class="pssc_ineqlink"><span class="pssc_ineq">'+ lefthandside + this.getTotalRelation() +'0</span></a></div></td>';
                for (var i = 0; i < this.roots.length; i++){
                    intervalhtml += '<td class="pssc_interval"><span><a href="javascript:;" class="pssc_intervalline" intervaltype="'
                        +this.getInterval(i)+'"></a><a href="javascript:;" class="pssc_rootpoint" pointtype="'
                        +this.getRootpoint(i)+'"></a></span></td>';
                }
                intervalhtml += '<td class="pssc_interval"><span><a href="javascript:;" class="pssc_intervalline" intervaltype="'
                    +this.getInterval(this.roots.length)+'"></a></span></td>';
            } else {
                var intervalhtml = '<td colspan="2"><div class="pssc_inequality"><span class="pssc_ineqlink"><span class="pssc_ineq">'+ lefthandside + this.getTotalRelation() +'0</span></span></div></td>';
                for (var i = 0; i < this.roots.length; i++){
                    intervalhtml += '<td class="pssc_interval"><span><span class="pssc_intervalline" intervaltype="'
                        +this.getInterval(i)+'"></span><span class="pssc_rootpoint" pointtype="'
                        +this.getRootpoint(i)+'"></span></span></td>';
                }
                intervalhtml += '<td class="pssc_interval"><span><span class="pssc_intervalline" intervaltype="'
                    +this.getInterval(this.roots.length)+'"></span></span></td>';
            }
            
            this.place.find('table.pssc_table tbody.pssc_intervals tr').html(intervalhtml)
                .find('.pssc_ineq').mathquill('embedded-latex');
            this.place.find('.pssc_ineq > span.binary-operator').last().addClass('pssc_ineqrelation');
        }

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
    
    Pssignchart.prototype.viewRow = function($tbody, i){
        // Add a row in view mode.
        var $trow = $('<tr></tr>');
        $trow.append('<td class="pssc_func"><span class="mathquill">'+this.rows[i].func
                +'</span></td><td class="pssc_motivation" mot="'+this.getMotString(i)
                +'"><span class="motshow"><span></span></span></td>');
        // Draw each "slot" in a function row.
        for (var j = 0, rowroot = 0; j < this.roots.length; j++){
            var $tdata = $('<td class="pssc_sign" sign="'+this.getSign(i, rowroot)+'" rootnum="'+rowroot+'"><span class="pssc_sign_elem"></span></td>');
            if (this.rows[i].isRoot(this.roots[j])){
                $tdata.addClass('pssc_isroot');
                rowroot++;
            }
            $trow.append($tdata);
        }
        $trow.append('<td class="pssc_sign" sign="'+this.getSign(i, rowroot)+'" rootnum="'+rowroot+'"><span class="pssc_sign_elem"></span></td>');
        $tbody.append($trow);
    }
    
    Pssignchart.prototype.editRow = function($tbody, i){
        // Add a row in edit mode
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
            $trow.append($tdata);
            }
        $trow.append('<td class="pssc_sign" sign="'+this.getSign(i, rowroot)+'" rootnum="'+rowroot+'"><a href="javascript:;"></a></td>');

            $tbody.append($trow);
            this.place.find('.mathquill:not(.mathquill-rendered-math)').mathquill();
        }

        if (this.rows.length > 0){
            // Add intervals
            var lefthandside = (this.rows.length === 1 ? this.rows[0].func : this.total.func);
            var intervalhtml = '<td colspan="2"><div class="pssc_inequality"><a href="javascript:;" class="pssc_ineqlink"><span class="pssc_ineq">'+ lefthandside + this.getTotalRelation() +'0</span></a></div></td>';
            }
            intervalhtml += '<td class="pssc_interval"><span><a href="javascript:;" class="pssc_intervalline" intervaltype="'
                +this.getInterval(this.roots.length)+'"></a></span></td>';
            this.place.find('table.pssc_table tbody.pssc_intervals tr').html(intervalhtml)
                .find('.pssc_ineq').mathquill('embedded-latex');
            this.place.find('.pssc_ineq > span.binary-operator').last().addClass('pssc_ineqrelation');
        }

        // Add labels for roots.
        $thead.empty().append('<tr><td colspan="2"><div></div></td></tr>');
        $thtr = $thead.find('tr');
        for (var i = 0; i < this.roots.length; i++){
            $thtr.append('<td class="pssc_headrootlabel"><div class="pssc_rootlabel"><span class="mathquill">'+this.roots[i].label+'</span></div></td>');
    }
    
    Pssignchart.prototype.initEdit = function(){
        // Init editing events of the signchart
        var signchart = this;
        var $tbody = this.place.find('tbody.pssc_body');
        
        // Init remove row.
        $tbody.find('td.pssc_func')
            .prepend('<a href="javascript:;" class="pssc_removerow_button pssc_bggrad"><span class="pssc_text">-</span><span class="pssc_icon"></span></a>')
            .find('a.pssc_removerow_button')
            .click(function(){
                var $thisbutton = $(this);
                var $thisfunc = $thisbutton.parents('td.pssc_func');
                var $allfunc = $thisfunc.parents('tbody').find('td.pssc_func');
                var index = $allfunc.index($thisfunc);
                signchart.removeFunc(index);
                signchart.place.find('.pssc_toolbar a.removerow.isopen').click().click();
                if (signchart.rows.length === 0){
                    signchart.place.find('tbody.pssc_intervals tr').empty();
                }
            });

        
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
            var latex = $(this).mathquill('latex');
            signchart.total.func = latex;
            signchart.place.find('tbody.pssc_intervals a.pssc_ineqlink')
                .html('<span class="pssc_ineq">'+latex + signchart.getTotalRelation() + '0</span>')
                .find('.pssc_ineq').mathquill('embedded-latex');
            signchart.place.find('.pssc_ineq > span.binary-operator').last().addClass('pssc_ineqrelation');
            signchart.changed();
        });
        
        // Init focusout for caption.
        this.captionelem.find('.mathquill-textbox').bind('focusout', function(e){
            var cap = $(this);
            var latex = cap.mathquill('latex');
            if (signchart.caption !== latex) {
                signchart.caption = latex;
                signchart.changed();
            }
        });
        
        // Init click to change relation of inequality.
        this.place.find('tbody.pssc_intervals a.pssc_ineqlink').click(function(){
            var lefthandside = (signchart.rows.length === 1 ? signchart.rows[0].func : signchart.total.func);
            signchart.nextTotalRelation();
            $(this).html('<span class="pssc_ineq">'+lefthandside + signchart.getTotalRelation() + '0</span>')
                .find('.pssc_ineq').mathquill('embedded-latex');
            signchart.place.find('.pssc_ineq > span.binary-operator').last().addClass('pssc_ineqrelation');
            signchart.changed();
        });
    }
    
    Pssignchart.prototype.showEdit = function(){
        // Init actions for adding and removing functions.
        var signchart = this;
        this.place.prepend('<div class="pssc_toolbarwrapper"></div>');
        this.toolbar = this.place.find('.pssc_toolbarwrapper');
        signchart.toolbar.append('<div class="pssc_addrowbox pssc_bggrad">'
            +'<span class="pssc_newfunc_title">f:</span><span class="mathquill-editable pssc_newfunc"></span>'
            +'<div class="pssc_newroots" roots="0"><a href="javascript:;" class="pssc_newroots_title pssc_bggrad">0</a><span class="mathquill-editable pssc_newroot1"></span><span class="mathquill-editable pssc_newroot2"></span></div><a href="javascript:;" class="pssc_addfuncbutton"><span class="pssc_text">+</span><span class="pssc_icon"></span></a></div>');
        signchart.toolbar.find('.pssc_addrowbox')
            .find('.mathquill-editable:not(.mathquill-rendered-math)')
            .mathquill('editable').eq(0).focus();
        signchart.toolbar.find('.pssc_addrowbox .pssc_newroots_title').click(function(){
            var $newroots = $(this).parents('.pssc_newroots');
            var amount = parseInt($newroots.attr('roots'));
            amount = (amount + 1) % 3;
            $newroots.attr('roots', amount);
            $(this).html(amount);
        });
        signchart.toolbar.find('.pssc_addrowbox .mathquill-editable').bind('keyup.pssignchart',function(e){
            var key = e.keyCode;
            switch (key){
                case 13:
                    $(this).parents('.pssc_addrowbox').find('a.pssc_addfuncbutton').click();
                    break;
                default:
                    break;
            }
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
                if (signchart.rows.length === 0){
                    signchart.place.find('tbody.pssc_intervals tr').remove();
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
        for (var i = 0; i < this.roots.length; i++){
            this.undefinedpoint[i] = false;
            this.rootpoints[i] = '';
            this.intervals[i] = '';
            this.total.signs[i] = '';
        }
        this.intervals[this.roots.length] = '';
        this.total.signs[this.roots.length] = '';
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
        // Empty total and intervals
        this.undefinedpoint = [];
        this.rootpoints = [];
        this.intervals = [];
        this.total.signs = [];
        for (var i = 0; i < this.roots.length; i++){
            this.undefinedpoint[i] = false;
            this.rootpoints[i] = '';
            this.intervals[i] = '';
            this.total.signs[i] = '';
        }
        this.intervals[this.roots.length] = '';
        this.total.signs[this.roots.length] = '';
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
        var emptysigns = [];
        for (var i = 0; i < this.roots.length; i++){
            emptysigns.push('');
        }
        options.signs = options.signs || this.total.signs || emptysigns;
        options.relation = options.relation || this.total.relation || '\\lt';
        this.total = {func: options.func, signs: options.signs, relation: options.relation};
        if (!nodraw){
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
        var emptysigns = [];
        for (var i = 0; i < this.roots.length; i++){
            emptysigns.push('');
        }
        options.signs = options.signs || this.total.signs || emptysigns;
        options.relation = options.relation || this.total.relation || '\\lt';
        this.total = {func: options.func, signs: options.signs, relation: options.relation};
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
    
    Pssignchart.prototype.setTotalRelation = function(relation){
        this.total.relation = relation;
        this.changed();
    }
    
    Pssignchart.prototype.getTotalRelation = function(){
        return this.total.relation || '\\lt';
    }
    
    Pssignchart.prototype.nextTotalRelation = function(){
        var relations = ['\\lt','\\gt','\\leq','\\geq'];
        this.total.relation = relations[(relations.indexOf(this.total.relation) + 1) % relations.length];
        this.changed();
    }
    
    Pssignchart.prototype.setInterval = function(n, onoff){
        onoff = (onoff ? 'inside':'');
        if (n < 0 || n > this.roots.length){
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
        var data = {rows: [], total: {func: "", signs: [], relation: '\\lt'}, intervals: [], rootpoints: [], undefinedpoint: [], caption: this.caption};
        for (var i=0; i<this.rows.length; i++){
            data.rows.push(this.rows[i].getData());
        }
        data.total.func = this.total.func;
        data.total.signs = this.total.signs;
        data.total.relation = this.total.relation;
        data.intervals = this.intervals.slice(0);
        data.rootpoints = this.rootpoints.slice(0);
        data.undefinedpoint = this.undefinedpoint.slice(0);
        options.result = data;
    }
    
    Pssignchart.prototype.setData = function(options){
        this.empty();
        this.caption = options.caption;
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
        icons: {
            emptytable: '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="60" height="60" viewbox="0 0 30 30"><path fill="#ccc" stroke="white" d="M5 15 a10 10 0 0 0 20 0 a10 10 0 0 0 -20 0z M10 20 a7 7 0 0 1 6 -12z M20 10 a7 7 0 0 1 -6 12z" /></svg>'
        },
        style:[
            '.pssc_default {min-height: 2em; background-color: white; padding: 5px 15px 15px 15px; border: 1px solid black; border-radius: 15px; box-shadow: 5px 5px 5px rgba(0,0,0,0.5); margin: 1em 0; text-align: center;}',
            '.pssc_default {background: rgb(254,255,232); /* Old browsers */ background: -moz-linear-gradient(top,  rgba(254,255,232,1) 0%, rgba(214,219,191,1) 100%); /* FF3.6+ */',
                'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(254,255,232,1)), color-stop(100%,rgba(214,219,191,1))); /* Chrome,Safari4+ */',
                'background: -webkit-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Chrome10+,Safari5.1+ */',
                'background: -o-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* Opera 11.10+ */',
                'background: -ms-linear-gradient(top,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* IE10+ */',
                'background: linear-gradient(to bottom,  rgba(254,255,232,1) 0%,rgba(214,219,191,1) 100%); /* W3C */',
                'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#feffe8", endColorstr="#d6dbbf",GradientType=0 ); /* IE6-9 */}',
            '.pssignchart .pssc_tablewrapper {clear: both; text-align: center; display: block;}',
            '.pssignchart a:hover {background-color: transparent;}',
            '.pssc_default table.pssc_table {border-collapse: collapse; margin: 0.2em auto; border: none; display: inline-block; text-align: left;}',
            '.pssc_default table.pssc_table caption {caption-side: bottom; text-align: center; margin: 1em 0 0 0;}',
            '.pssc_default table.pssc_table caption span.mathquill-textbox {display: block; border: none;}',
            '.pssignchartwrapper {text-align: center;}',
            '.pssignchart {position: relative; display: inline-block; text-align: left; min-height: 70px; padding: 0.5em;}',
            '.pssignchart.editmode {margin-bottom: 2em;}',
            '.pssc_default table.pssc_table tbody.pssc_body {border: 1px solid black; min-width: 10em;}',
            'table.pssc_table tr:nth-child(even) td {background-color: #eef;/*#dfb;*/}',
            'table.pssc_table tr:nth-child(odd) td {background-color: white;}',
            'table.pssc_table tr.pssc_total {border-top: 4px solid black;}',
            '.pssc_tablewrapper {margin: 0 auto; position: relative;}',
            'table.pssc_table .pssc_head tr td {color: black; background-color: transparent; padding-top: 0.7em;}',
            'table.pssc_table .pssc_head td div {min-height: 1em;}',
            'td.pssc_headrootlabel {text-align: right;}',
            'td.pssc_headrootlabel .pssc_rootlabel {text-align: left; display: inline-block;}',
            '.pssc_rootlabel {position: relative; overflow: visible; text-align: center; white-space: nowrap; padding-bottom: 0.5em;}',
            '.pssc_rootlabel > span.mathquill {display: inline-block; position: relative; right: -50%; margin-top: -1em; vertical-align: bottom; white-space: nowrap;}',
            'table.pssc_table .pssc_body tr.pssc_emptytable td {width: 15em;}',
            'table.pssc_table .pssc_body tr.pssc_emptytable td svg {display: block; width: 60px; margin: 0.5em auto;}',
            'table.pssc_table .pssc_body td.pssc_isroot {border-right: 3px solid black;}',
            'table.pssc_table .pssc_body td {min-width: 3em; border-right: 1px dotted black; padding: 0;}',
            'table.pssc_table .pssc_body td.pssc_func {padding: 0 1em; border-right: none;}',
            '.editmode table.pssc_table .pssc_body td.pssc_motivation {padding: 0 1em; border-right: 1px solid black; cursor: pointer; padding: 0;}',
            'table.pssc_table .pssc_body td.pssc_motivation a span, table.pssc_table .pssc_body td.pssc_motivation span span {width: 30px; height: 20px; display: block; margin: 0 auto;}',
            'table.pssc_table .pssc_body td.pssc_motivation a {text-align: center; display: block; border: 1px solid #777; border-radius: 4px; margin: 0;}',
            'table.pssc_table .pssc_body td.pssc_motivation > span {text-align: center; display: block; margin: 0;}',
            'table.pssc_table .pssc_body td.pssc_motivation a.motshow {margin: 3px;}',
            '.pssc_default, table.pssc_table td.pssc_motivation a, .pssignchart .pssc_toolbar li a, .pssignchart .pssc_addfuncbutton, .pssc_bggrad  {',
                'background: rgb(255,255,255); /* Old browsers */',
                'background: -moz-linear-gradient(top,  rgba(255,255,255,1) 0%, rgba(246,246,246,1) 47%, rgba(237,237,237,1) 100%); /* FF3.6+ */',
                'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(255,255,255,1)), color-stop(47%,rgba(246,246,246,1)), color-stop(100%,rgba(237,237,237,1))); /* Chrome,Safari4+ */',
                'background: -webkit-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Chrome10+,Safari5.1+ */',
                'background: -o-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* Opera 11.10+ */',
                'background: -ms-linear-gradient(top,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* IE10+ */',
                'background: linear-gradient(to bottom,  rgba(255,255,255,1) 0%,rgba(246,246,246,1) 47%,rgba(237,237,237,1) 100%); /* W3C */',
                'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#ffffff", endColorstr="#ededed",GradientType=0 ); /* IE6-9 */}',
            'table.pssc_table td.pssc_total {padding: 0 1em; border-right: 1px solid black;}',
            'table.pssc_table td.pssc_motivation[mot="linear-asc"] .motshow span, ul.motivationselector a[mot="linear-asc"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEGSURBVEiJxdWxSoMxFMXx39XOYl3EQcFFO+ju/E3dFXwAn0foIgg+gVBwcPcl2urg4Obi3EnwOhSltNjaNp8euBDITf7knIREZvoPrdW1cURUEXH3Y0NmFi9UeEM1YK/H7lRPndDM1Oeyz9VkX5TMOCIq3OK8xzMugnbQwP06N4eZrxTMeByamQ9oBodoJptJ64Ot7wV12DteAzo9rotnPAuamZ44eOSoKHgedFYFTtBeItZ9nKGLlwXXdpe9XKtAR/pLe5fOuBQ0MzW+Th7hGKdjZryjk2k4mp96pyupMTbeQWsCvIFhaSjmW62gvb/OuC7oTHCd0Myc+UlsF810QkW/xUX0CTXVXBQFUC9+AAAAAElFTkSuQmCC); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="linear-desc"] .motshow span, ul.motivationselector a[mot="linear-desc"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEVSURBVEiJxZTBSgJRFIa/X32CwGgTYds2ghAtYza5LBCkHqlV7dq3EEPoDcw3EIxp61patve46CZqTjpzj/nDYeDeM3xz///OkZmxD5WyNiTdSkr+DTyUqh/SATABujuDm9lSpXCfwmOIIAE+gWS1L7b0k/FIOizDncGNoGLwUoLnM6gDXaBtZn2vA8+tLsMJcKXv57GgOYXTAGvjbfsaqx/e4Wl1HWfbfy2MoJHC+dpmR3j+F5zgAi6AZs6EakAL6AHjAgn3MgfIBo0DtBU+Ir+icoqwPf52FoTPB0iMwv+9NGQkjoDrhbYp0DHjK9rqv04Odgn2BjYI1Qeru1ld1HZXcB64O3hb+E7AC/DXrH2XW11EM/myp6tY/ecvAAAAAElFTkSuQmCC); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-up-0"] .motshow span, ul.motivationselector a[mot="parab-up-0"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFjSURBVEiJ7dWxS1VhGMfxz3NRN9FyCJrEhis1OUS4SbvQFCStgRg4NPg3tDo41dDiINHQ2n9QLXFRcalREY0QGqOn5RXict/j8RbexQfOcJ7f8/v+eM8573kjM42iOjUhIlYjYnxYcESMR8SNSwfjKZZqYi+iexAx0+Bfwvthgt9ipSaOsfGbFw3+FbyriVF7xxExha+4l5nH5/1eRLfDk+ARfgYfOmzNZ37/y3sLe7iTmWeD+NUVF8M21voMM0EXU7iZzP9ius++hu1a6HlA9cIcjjDZr+3yZpeXAzyTxTPXyG4SC2gTO/39PRZ6A+DYweaF3BbBE/iE9Raz62V24p+DC3AWx1hsmFksM7OtmG2GCngZp3iu7IbSj9I7xXJbXnU7DaqIuItX5aP7XNr38Q3PMnO/NWuYf3VE3MaDcvsxMw8vzRjVIRF4iMdXnPt6DCf4csXBP0b2qJtOp+vg/1p/AHb4s9JeAxr4AAAAAElFTkSuQmCC); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-up-1"] .motshow span, ul.motivationselector a[mot="parab-up-1"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAF6SURBVEiJ7dSxalRREAbgb5YkXQgpJKJNClGLpBXT2YgWbq1EbUOMkAew8gUs0lpYiClERUQLC8Fe0pi9m7yBKAlI8AHGYk90uZtdblZQhAzc4vzzz/+fc2buicz0L6I1LBERqxExOa5wRExGxOyxjXEHV8Y1LrVvxjF+geU/MF7Gq6HZzDzywwz2MTeMM6J2rtTODOMMnHgn4nYVsZqZB9jE2hinXcNmZh5UETeqiAd1woBxshhcLssNrETEdFPHwl0ptVosBJcGeIe/UzfiGt7XNtFe5CpOZ+bNhsbP8XWbpy22anp3FzKf9RZ9977L+YrHHV5/5kL2bmQKn7DeoLfrhTuVmbqcq3hU8WGbix+Z+MWtF3e41+FhTXAe37A0wnSpcOb78YpbXTYG+EcKlRbUhNt6k3pfXx5RsH20h+i16ljoDdL1Jv3DqbKBWXwp2Bl8x1vsNdR5OdGQeBh7eIJpnC3YO/w4ps7vqf7bMerJPDE+Mf4/jX8CUIo9ubKExnoAAAAASUVORK5CYII=); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-up-2"] .motshow span, ul.motivationselector a[mot="parab-up-2"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHWSURBVEiJxZQ/SxxhEMZ/z+ZW8g1SiYqcf3KNiRIFGwMXTGdxmMoyxFLEPl0+hFXSJ0XaAy2sRLnDI1nvDlQk9vYhyk2Km1sXkvV2F8GBgX1nnnmemXmXV2bGY1iQlpD0QVKpKLGkUNL7VICZxf4TFgbfQAuYT+bzODAPnAzOp/AqmY8njqRRwVFbGvFQA1goOrHXNuMB4bAjlQfnEkBb2gxg1vqr/9iRGi68COwWFF4EjtvSeg8qgqAHW22p8dzsS/BVegJMGkx6Z1M9mAL2gTcFRfHafYMJwbRzTxjMIgXxzjswHoFdwtPEPV0AlQL3WwEukrEI7AfM/HPHM3AleDdu9jvRdR1YLTDtqtfGJljvwlkcGNL5GlAvMHEdWLsPU5K0BLxN6XwEWJH0CbjJOG0IrABNSS9SMN9SHxC3P8A58DKjKI4999p0y7C2OeAXEGbAho6dG4Yd+iSaWUtSBGwAnyWeAa8TkFvguxm3jonMrDV0Lxl/lmWgCwRgNbBWwptglX6OLrCciTPHn3oA1O7J14CDzHw5hKvAFTD2n9yY56oPLuwC2/QfgXIiVvbYdi6uPGAX2gGugWP3a2AnL4+cLJdJCn31AHtmlvVxueMoIvwQ9hchhu86AOETqAAAAABJRU5ErkJggg==); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-down-0"] .motshow span, ul.motivationselector a[mot="parab-down-0"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAErSURBVEiJ5dQxSoNBEIbhZ0ViqYUQsQpWkgso5gI2gqBga2lnk4OkzgUsYhNI4QUUTGVpZSnENAF7xyIbCGL++IdoCge22Nlv5mVnZzZFhFXY2kqo/xKccIjjP+beru7Gq+rq9UWCUkq7OMjbx4h4LZ0kIn68UMc9BrjLa5B99VK5SkBPMMSV/ETZn7JviJOlglHDGxoFmkbW1JYCRgV9NH+gbWZtZRngFrolnqSL1jxd4TillPbwgP2IGI19dnA6JfvATYT3HLOFZxxFxMus3PPG6RrtCTTbPi6Mm2oC7uMJImKUUmrn2OuZmQtKtmncqdUyY5Jjqzl2c5am6Mu8RC8iBnOq8t1lBujlHN9aEfgcnbLQKevgbOZpQbmusFG2zF/GcHuhrv5N+wSM50No4tDxQgAAAABJRU5ErkJggg==); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-down-1"] .motshow span, ul.motivationselector a[mot="parab-down-1"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAE/SURBVEiJ7dS/SlxREMfxzwmynSwIsoWFaxN8BGFfQCGL+UMwnZZ2NltbJI2tz2BhsWmCgk1eIFYp06WKuFkQor2TYs/iRbzXe1GxceDCZc5v5nuG+XFSRHiOePUs1BfwC/gpI2EFqw3rZrGQ///gqmH915mGBfPoYw7nOfcGFzjCuHaniKj1ZeAY20iFfMq5Mfq1+9WEdvEXvQpNL2u6jwJGC6cY1NAOsrZ1nzZN3+qUdPCusIVrHJK+YCki1uusLqX0Db+JPby93S9iYsSiuV5jo7h+Ds7wCct1oDk28YuTH6xtmHhgCj7FT9xMXHL7ffyLiN0GYCmlz2hHxE6pqGJfbROnduo6tVDbybXtMk3Vy7WF44gYNZk2DzPCce5xZ1SBP2DYFFqIIT6WHVa9XO9x+QDwdyyWHVaa6ynjP4T7ZWdT7KhuAAAAAElFTkSuQmCC); background-position: center center; background-repeat: no-repeat;}',
            'table.pssc_table td.pssc_motivation[mot="parab-down-2"] .motshow span, ul.motivationselector a[mot="parab-down-2"] span ',
                '{background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAUCAYAAACaq43EAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGfSURBVEiJxdU/a1RBFAXw340LIX8gnZhCyCdQg41YyK4WWqWySQrzPezFxsIqCOkklSwpTBVIKsGk2EJ239rYBAS3lQW1cyx2Amt03+7bLHpgijf3nnPnzNyZFykl/wO1aUgRcR2P82czpfS5qsZcxYIREbtoYz2PdkTsRkRUqpxSmnhgB++w9J6FN1zBUp7bqaRVoegmPmAlpaTgeYenObaSY5szLYxAB/UWix3qBW8Lmh+5l53Xc07MsvAGTlJKumwU9Lp8L/hW8KXD3Zx3go1ZFj69KNjhVZeXf1ng6SSaY7s6Ih5gGQfD83Mc/+ToQvoBljOnXBd38Kgk54lB47THiWXcwC28LslpjnO8iFUUExaVc1czdzTGnO0W9qvcz8zbx9ZlzvghDiu4Pcdh5lZ3bHD+PaxN4Xgtc0fe6VqEeTwz6NxzHOMT+imls6p2U0pnEdHHzQhXcX8o/BUvatlZ3+9/qh9o+PO6VMFR1ujh2tD8AubLtmsP21W3eYi/jb1pmmsdrUs4buH2yGjJihsmfPBLmrMxKh456Z/jF3i7xrFI8axPAAAAAElFTkSuQmCC); background-position: center center; background-repeat: no-repeat;}',
            '.motivationselectwrapper {position: relative;}',
            '.motivationselectwrapper ul.motivationselector {position: absolute; top: -25px; left: -6px; list-style: none; margin: 0; padding: 2px; width: 102px; background-color: #eee;',
                'border: 1px solid #777; border-radius: 4px; box-shadow: 4px 4px 4px rgba(0,0,0,0.5); z-index: 10;}',
            '.motivationselectwrapper ul.motivationselector li {display: inline-block; margin: 1px; padding: 0; vertical-align: top;}',
            '.motivationselectwrapper ul.motivationselector li a {width: 30px; height: 20px; margin: 0; padding: 0; display: block;}',
            'table.pssc_table td.pssc_sign {cursor: default; text-align: center; min-width: 50px; width: 50px;}',
            '.editmode table.pssc_table td.pssc_sign {cursor: pointer; text-align: center; min-width: 50px; width: 50px;}',
            'table.pssc_table td.pssc_sign[sign=""]:before {content: "\\0000a0";}',
            'table.pssc_table td.pssc_sign[sign="plus"]:before {content: "+"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black; margin: 0 7px;}',
            'table.pssc_table td.pssc_sign[sign="plus"] {background: rgb(248,80,50); /* Old browsers */',
                'background: -moz-linear-gradient(top,  rgba(248,80,50,1) 0%, rgba(241,111,92,1) 50%, rgba(246,41,12,1) 51%, rgba(240,47,23,1) 71%, rgba(231,56,39,1) 100%); /* FF3.6+ */',
                'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(248,80,50,1)), color-stop(50%,rgba(241,111,92,1)), color-stop(51%,rgba(246,41,12,1)), color-stop(71%,rgba(240,47,23,1)), color-stop(100%,rgba(231,56,39,1))); /* Chrome,Safari4+ */',
                'background: -webkit-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Chrome10+,Safari5.1+ */',
                'background: -o-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* Opera 11.10+ */',
                'background: -ms-linear-gradient(top,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* IE10+ */',
                'background: linear-gradient(to bottom,  rgba(248,80,50,1) 0%,rgba(241,111,92,1) 50%,rgba(246,41,12,1) 51%,rgba(240,47,23,1) 71%,rgba(231,56,39,1) 100%); /* W3C */',
                'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#f85032", endColorstr="#e73827",GradientType=0 ); /* IE6-9 */}',
            'table.pssc_table td.pssc_sign[sign="minus"]:before {content: "\u2014"; font-weight: bold; display: block; text-align: center; color: white; text-shadow: 0 0 1px black; margin: 0 7px;}',
            'table.pssc_table td.pssc_sign[sign="minus"] {background: rgb(183,222,237); /* Old browsers */',
                'background: -moz-linear-gradient(top,  rgba(183,222,237,1) 0%, rgba(113,206,239,1) 50%, rgba(33,180,226,1) 51%, rgba(183,222,237,1) 100%); /* FF3.6+ */',
                'background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(183,222,237,1)), color-stop(50%,rgba(113,206,239,1)), color-stop(51%,rgba(33,180,226,1)), color-stop(100%,rgba(183,222,237,1))); /* Chrome,Safari4+ */',
                'background: -webkit-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Chrome10+,Safari5.1+ */',
                'background: -o-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* Opera 11.10+ */',
                'background: -ms-linear-gradient(top,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* IE10+ */',
                'background: linear-gradient(to bottom,  rgba(183,222,237,1) 0%,rgba(113,206,239,1) 50%,rgba(33,180,226,1) 51%,rgba(183,222,237,1) 100%); /* W3C */',
                'filter: progid:DXImageTransform.Microsoft.gradient( startColorstr="#b7deed", endColorstr="#b7deed",GradientType=0 ); /* IE6-9 */}',
            'table.pssc_table .focushere {box-shadow: 2px 2px 1px green, -2px -2px 1px green, 2px -2px 1px green, -2px 2px 1px gree;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals {border: none; background-color: transparent;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td {border: none; background-color: transparent; height: 1em;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval {border-bottom: 1px dotted #777; vertical-align: bottom;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span {display: block; margin: 0; padding: 0; position: relative;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span .pssc_rootpoint {display: inline-block; position: absolute; width: 8px; height: 8px; right: -5px; bottom: -6px; border: 1px solid #bbb; border-radius: 5px; z-index: 5;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span span.pssc_rootpoint[pointtype=""] {display: none;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span .pssc_rootpoint[pointtype="open"] {border: 2px solid red; background-color: white;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span .pssc_rootpoint[pointtype="closed"] {border: 1px solid red; background-color: red;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span .pssc_intervalline {display: block; height: 4px; position: absolute; left: -1px; right: -1px; bottom: -3px;}',
            '.pssc_default table.pssc_table tbody.pssc_intervals td.pssc_interval span .pssc_intervalline[intervaltype="inside"] {border-bottom: 4px solid red;}',
            '.pssignchart .pssc_toolbarwrapper {text-align: left; margin: 0; position: relative;}',
            '.pssignchart ul.pssc_toolbar {list-style: none; margin: 0; padding: 0; position: absolute; top: 20px; left: -60px;}',
            '.pssignchart ul.pssc_toolbar li {margin: 0.3em 0; padding: 0; display: block;}',
            '.pssignchart ul.pssc_toolbar li a {display: block; border: 1px solid #777; border-radius: 4px; height: 20px; width: 20px;}',
            '.pssignchart ul.pssc_toolbar li a.isopen {border-color: red;}',
            '.pssignchart a.addrow span {display: block; height: 20px; width: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJOgAACToB8GSSSgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFgSURBVDiNzVQxSMNAFH3/0rRm6yjiUlwCHcRN54Kbgzi4BFSos3RxtNTRpTgrqJBVHNwEZ93EoZBFXEQcC0Vi7pr7DpWmSe1VSwUf3HL337v//juOmBnThJiq2l8I5sYVHF0sVphjDwCILH9/6/HWVE+mGTbOl4qWVK8AO1/lYZy35+rbD+1RHLPlTuQqGTtKavRW7KATuSaK0bJSgEbagQAZexiyXGuUisLJuQAgYpSZ6DRDqGoLLQDQYTdo1p/bmfNEcO9woQLQNQDH2EaCEOC144OnflApy1LCo34AP4LDgAfge0El9ZgJDSP7RlKC3Uj7INrEbywz+4MbQ6Hs1EpFFSkXAJioDE6HAuIqMbcAwC7YwVnTEEoWG7vzy4JxN7inCSuXJy/3ozjmdxgCQqQv1No8ZaOg9W4HsvARIplpmI9mAhPHaBkAVtdnKxDs9doj/+bqbfLPYRL8/w/2E7FJjqbuDTz5AAAAAElFTkSuQmCC) center center no-repeat;}',
            '.pssignchart a.removerow span {display: block; height: 20px; width: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJOgAACToB8GSSSgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACOSURBVDiN7ZMhDsJQEETfNBhsD1GB4wzVSILp8eoq0ZwBV9FD4ADHYBC/TUt+0y8qOnKy+7Kb2ZVtUipLStuA6wTuhkYr5YIiptnQHexH6Cm8w7tUAldgHznQGzgd7dvohC+oZsD41VbAJHCxesAn1IILM1Y21KGh4S83Uv6JDCWD7vwvlBRa/2FvwOX6AlldJihgfCAkAAAAAElFTkSuQmCC) center center no-repeat;}',
            '.pssignchart .pssc_toolbarwrapper .pssc_addrowbox {position: relative; border: none; border-radius: 0.5em; box-shadow: 0 0 3px black; padding: 0.5em; z-index: 10; background-color: #fefefe; margin-bottom: 0; white-space: nowrap;}',
            '.pssignchart .pssc_newfunc_title {font-style: italic; margin-left: 1em;}',
            '.pssignchart .pssc_newroots_title {display: inline-block; width: 1.5em; height: 1.5em; border: 1px solid #777; border-radius: 4px; text-align: center; text-decoration: none; font-weight: bold; color: black;}',
            '.pssignchart .pssc_toolbarwrapper .pssc_newfunc {display: inline-block; min-width: 5em; min-height: 1.3em; margin: 0 1em; vertical-align: bottom;}',
            '.pssignchart .pssc_toolbarwrapper .pssc_newroots, .pssignchart .pssc_toolbarwrapper .pssc_newroot1, .pssignchart .pssc_toolbarwrapper .pssc_newroot2 {display: inline-block; visibility: visible; min-width: 4em; min-height: 1.3em; margin: 0 0.5em;}',
            '.pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="0"] .pssc_newroot1, .pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="0"] .pssc_newroot2, .pssignchart .pssc_toolbarwrapper .pssc_newroots[roots="1"] .pssc_newroot2 {visibility: hidden;}',
            '.pssignchart .pssc_addfuncbutton {border: 1px solid #777; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; text-align: center; width: 1.5em; height: 1.5em; min-width: 20px; min-height: 20px; padding: 0; margin: 0.2em; vertical-align: top;}',
            '.pssignchart span.mathquill-editable.inputerror {background-color: #faa;}',
            '.pssignchart span.mathquill-editable {background-color: white;}',
            '.pssignchart .pssc_totalwrapper {position: relative;}',
            '.pssc_totalwrapper .pssc_totalundefined {position: absolute; left: 47px; top: -2em; width: 9px; height: 3em; background-color: transparent;}',
            '.pssc_totalwrapper a.pssc_totalundefined:hover {background-color: rgba(255,255,0,0.8);}',
            '.pssc_totalwrapper .pssc_totalundefined.isundefined {background: rgba(255,255,0,0) url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAGCAYAAAARx7TFAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAEJwAABCcB2U8dgAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABESURBVAiZjc6xDYBADAPAC12moqb9ghlZg2kYIzSP9AVFLFkubNmOqrIiIhIHTuy4zVBi4MIzdSC/kl9j5aaDzlx0jr/6Nimp6cXzJwAAAABJRU5ErkJggg==) center top repeat-y;}',
            'a.pssc_removerow_button {display: block; width: 15px; height: 15px; margin-left: -40px; border: 1px solid #777; border-radius: 4px; position: absolute; opacity: 0.7; border: none; }',
            'a.pssc_removerow_button:hover {opacity: 1; border: 1px solid #777; margin-left: -41px; margin-top: -1px;}',
            'a.pssc_removerow_button span.pssc_icon {display: block; width: 15px; height: 15px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAG7AAABuwBHnU4NQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFISURBVCiRhZO9ahtBFIW/c/cnCG8Q2IIQEUiTIo1rPYDwc7j3K9ilH8RNHiFlSJE3CCE4kCIhkBQmqwXbzWLNcSFZaFdiPTAw93IO37nDjGyzb/3JsrMSyhyqo+Xycp8m3y6+SecvIl5mQCnNJX2SPb8tiqqMIAPytr3AftgxAz9JaRSAs+w62RiukbCNVppN1I5ZcGrp0KvzZmODBBEt9tWTPnrkd0hfBRPsGfYHYCY4xv4IvN8W9821Uvpt+AUQWfYFwNKNI37YXgyZF444AO46XbuRPRY0g2SgknTf6ze2x8AwWXDgPhkaRTxrrg2VoEuWVmRpMPYCe4csuxGMBy9MsDBUSqlDTuuZQ+qY+y+s3juztCKn9ExseK2INwBeLmfr2K+At/TI2v5V36Uqh5MCpnnEtJQmuVQX0t9C+jdq28/Y/5/0jzvgjtI+Y4wZAAAAAElFTkSuQmCC) center center no-repeat;}',
            '.pssignchart .pssc_addrowbox a.pssc_addfuncbutton span.pssc_icon {display: block; width: 1.5em; height: 1.5em; min-width: 20px; min-height: 20px; background: transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAJOgAACToB8GSSSgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFgSURBVDiNzVQxSMNAFH3/0rRm6yjiUlwCHcRN54Kbgzi4BFSos3RxtNTRpTgrqJBVHNwEZ93EoZBFXEQcC0Vi7pr7DpWmSe1VSwUf3HL337v//juOmBnThJiq2l8I5sYVHF0sVphjDwCILH9/6/HWVE+mGTbOl4qWVK8AO1/lYZy35+rbD+1RHLPlTuQqGTtKavRW7KATuSaK0bJSgEbagQAZexiyXGuUisLJuQAgYpSZ6DRDqGoLLQDQYTdo1p/bmfNEcO9woQLQNQDH2EaCEOC144OnflApy1LCo34AP4LDgAfge0El9ZgJDSP7RlKC3Uj7INrEbywz+4MbQ6Hs1EpFFSkXAJioDE6HAuIqMbcAwC7YwVnTEEoWG7vzy4JxN7inCSuXJy/3ozjmdxgCQqQv1No8ZaOg9W4HsvARIplpmI9mAhPHaBkAVtdnKxDs9doj/+bqbfLPYRL8/w/2E7FJjqbuDTz5AAAAAElFTkSuQmCC) center center no-repeat;}',
            '.pssc_inequality {margin-bottom: -1em;}',
            'a.pssc_ineqlink {color: black; text-decoration: none; display: inline-block;}',
            'a.pssc_ineqlink .pssc_ineq {cursor: pointer;}',
            '.pssignchart.editmode .pssc_ineqrelation {color: red; font-weight: bold;}',
            '.pssignchart .pssc_removerow_button {display: none;}',
            '.pssignchart.editmode .pssc_removerow_button {display: inline-block;}',
            '.pssignchart a .pssc_text {display: none;}',
            '.pssignchart a .pssc_icon {display: inline-block;}'
        ].join('\n')
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
        for (var i = 0; i < this.roots.length + 1; i++){
            this.signs[i] = this.signs[i] || '';
        }
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

