module.exports = function (saphyreData, models) {

    var Article = models.Article,
        model = saphyreData.createModel(Article);

    model.projection('all', {
        'article_id' : 'id',
        'title' : 'title',
        'content' : 'content',
        'Author.author_id' : 'author.id',
        'Author.name' : 'author.name',
        'Tags' : 'tags'
    });

    model.projection('viewed', {
        'article_id' : 'id',
        'title' : 'title',
        'content' : 'content',
        'Author.author_id' : 'author.id',
        'Author.name' : 'author.name',
        'Tags' : 'tags',
        'Views.Viewer.user_id' : {
            alias : 'viewed',
            criteria : {
                criteriaName : 'user',
                name : 'userId',
                property : 'Views.Viewer.user_id',
                operator : saphyreData.OPERATOR.EQUAL
            }
        }
    }).use(function (article) {
        article.viewed = article.viewed != null && article.viewed > 0;
    });

    model.projection('viewers', {
        'article_id' : 'id',
        'title' : 'title',
        'content' : 'content',
        'Views.Viewer' : {
            list : 'viewers',
            projection : {
                'user_id' : 'id',
                'name' : 'name'
            },
            criteria : {
                criteriaName : 'user',
                name : 'userId',
                property : 'user_id',
                operator : saphyreData.OPERATOR.EQUAL
            }
        }
    });

    model.projection('with-info', {
        'article_id' : 'id',
        'title' : 'title',
        'Author.author_id' : 'author.id',
        'Author.name' : 'author.name',
        'Info.status' : 'info.status',
        'Info.Owner.name' : 'info.owner.name'
    });

    model.projection('tags-no-cache', {
        'article_id' : 'id',
        'title' : 'title',
        'Tags' : {
            list : 'tags',
            projection : {
                'tag_id' : 'id',
                'name' : 'name'
            }
        }
    });

    model.projection('list', {
        'article_id' : 'id',
        'title' : 'title',
        'date' : 'date'
    }).use(function (article) {
        article.title = article.title.toUpperCase();
    });

    model.projection('error', {
        'unknown_property' : 'unknown'
    });

    model.criteria('id', {
        name : 'id',
        property : 'article_id',
        operator : saphyreData.OPERATOR.EQUAL
    });

    model.criteria('without-content', {
        name : 'content',
        property : 'content',
        operator : saphyreData.OPERATOR.IS_NULL
    });

    model.criteria('with-content', {
        name : 'content',
        property : 'content',
        operator : saphyreData.OPERATOR.IS_NOT_NULL
    });

    model.criteria('ids', {
        name : 'ids',
        property : 'article_id',
        operator : saphyreData.OPERATOR.IN
    });

    model.criteria('not-ids', {
        name : 'not-ids',
        property : 'article_id',
        operator : saphyreData.OPERATOR.NOT_IN
    });

    model.criteria('tag', {
        name : 'name',
        property : 'Tags.name',
        operator : saphyreData.OPERATOR.EQUAL
    });

    return model;

};