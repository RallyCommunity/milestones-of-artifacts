Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    targetDate:null,
    launch: function() {
        this.add({
            xtype: 'component',
            itemId: 'datepick',
            html: 'pick a date to filter Milestones by TargetDate greater than selected date:',
            width: 400,
            margin: 10
            },
            {
            xtype: 'rallydatepicker',
            showToday: false,
            contentEl: Ext.ComponentQuery.query('#datepick')[0],
            margin: 10,
            handler: function(picker, date) {
                this._onDateSelected(date);
            },
            scope:this
            },
            {
            xtype: 'container',
            itemId: 'gridContainer'
        });
    },
    _onDateSelected:function(date){
        targetDate = date;
        var formattedDate = Rally.util.DateTime.formatWithDefault(date, this.getContext());
        Ext.ComponentQuery.query('#datepick')[0].update((formattedDate) + '<br /> selected');
        Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['UserStory', 'Defect','PortfolioItem/Feature'],
            fetch: ['Name','FormattedID','PlanEstimate','PercentDoneByStoryCount','Milestones'],
            autoLoad: true,
            filters: [
                {
                    property: 'Milestones.ObjectID',
                    operator: '!=',
                    value: null
                }
            ],
            listeners: {
                load: this._onDataLoaded,
                scope: this
            }
        });
    },
    
    _onDataLoaded: function(store, data){
        console.log('targetDate',Rally.util.DateTime.toIsoString(targetDate,true));
        var workItems = [];
        var pendingWorkitems = data.length;
        _.each(data, function(workitem){
            var o = {
                FormattedID: workitem.get('FormattedID'),
                Name: workitem.get('Name'),
                PlanEstimate: workitem.get('PlanEstimate'), // || 'N/A'
                PercentDoneByStoryCount: workitem.get('PercentDoneByStoryCount'),
                _ref: workitem.get("_ref"),
                Milestones: []
            };
            var milestones = workitem.getCollection('Milestones',
                    {
                        fetch:['Name','FormattedID','TargetDate','TargetProject'],
                        filters:[{property: 'TargetDate',operator: '>',value: Rally.util.DateTime.toIsoString(targetDate,true)}]
                    });
            milestones.load({
                callback: function(records, operation, success){
                    _.each(records, function(milestone){
                        o.Milestones.push({
                            _ref: milestone.get('_ref'),
                            FormattedID: milestone.get('FormattedID'),
                            Name: milestone.get('Name'),
                            TargetDate: milestone.get('TargetDate'),
                            TargetProject: milestone.get('TargetProject')._refObjectName
                        });
                    }, this);
                    
                    --pendingWorkitems;
                    if (pendingWorkitems === 0) {
                        this._makeGrid(workItems);
                    }
                },
                scope: this
            });
            console.log('o.Milestones.length',o.Milestones.length);
            workItems.push(o);
        },this);
    },
    
     
    _makeGrid: function(workItems){
        if (this.down('rallygrid')) {
            Ext.ComponentQuery.query('#gridContainer')[0].remove(Ext.ComponentQuery.query('#workItemsGrid')[0], true);
        }
        var workItemsStore = Ext.create('Rally.data.custom.Store', {
            data: workItems,
            remoteSort:false
        });
        this.down('#gridContainer').add({ 
            xtype: 'rallygrid',
            itemId: 'workItemsGrid',
            store: workItemsStore,
            columnCfgs: [
                {
                   text: 'Formatted ID', dataIndex: 'FormattedID'
                },
                {
                    text: 'Name', dataIndex: 'Name'
                },
                {
                   text: 'PlanEstimate', dataIndex: 'PlanEstimate'
                },
                {
                    text: 'PercentDoneByStoryCount', dataIndex: 'PercentDoneByStoryCount'
                },
                {
                    text: 'Milestones', dataIndex: 'Milestones',minWidth:200,
                    renderer: function(value) {
                        if (value.length > 0) {
                            var html = [];
                            _.each(value, function(milestone){
                                html.push('<a href="' + Rally.nav.Manager.getDetailUrl(milestone) + '">' + milestone.FormattedID + ' ' + milestone.Name +  '</a>');
                            });
                            return html.join(',<br> ');
                        }
                        else{
                            return 'no milestones that meet criteria';
                        }
                        
                    }
                },
                {
                    text: 'TargetDate', dataIndex: 'Milestones', 
                    renderer: function(value) {
                        var html = [];
                        _.each(value, function(milestone){
                            html.push(Rally.util.DateTime.toIsoString(milestone.TargetDate,true).substring(0, 10));
                        });
                        return html.join(',<br> ');
                    }
                },
                {
                    text: 'TargetProject', dataIndex: 'Milestones', 
                    renderer: function(value) {
                        var html = [];
                        _.each(value, function(milestone){
                            html.push(milestone.TargetProject);
                        });
                        return html.join(',<br> ');
                    }
                }
            ]
            
        });
    }
});
