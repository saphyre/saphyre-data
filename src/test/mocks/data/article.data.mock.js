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

    return model;

};