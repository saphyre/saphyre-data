module.exports = function (saphyreData, models) {

    var Author = models.Author,
        model = saphyreData.createModel(Author);

    model.projection('all', {
        'author_id' : 'id',
        'name' : 'name',
        'Articles' : {
            list : 'articles',
            projection : {
                'article_id' : 'id',
                'title' : 'title',
                'Tags' : 'tags'
            }
        }
    });

    model.projection('article-tags', {
        'author_id' : 'id',
        'name' : 'name',
        'Articles.Tags' : {
            list : 'articleTags',
            projection : {
                'tag_id' : 'id',
                'name' : 'name'
            }
        }
    });

    model.projection('list', {
        'author_id' : 'id',
        'name' : 'name'
    });

    model.criteria('id', {
        name : 'id',
        property : 'author_id',
        operator : saphyreData.OPERATOR.EQUAL
    });

    return model;

};