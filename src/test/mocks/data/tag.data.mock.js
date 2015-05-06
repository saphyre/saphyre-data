module.exports = function (saphyreData, models) {

    var Tag = models.Tag,
        model = saphyreData.createModel({
            model : Tag,
            cached : true,
            timeout : 5000
        });

    model.projection('default', {
        'tag_id' : 'id',
        'name' : 'name'
    });

    return model;

};