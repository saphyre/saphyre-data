var chai   = require('chai'),
    expect = chai.expect,
    mock = require('./mocks/db.mock');

describe('this test', function () {
    it('should have 4 models', function () {
        expect(mock.models).to.have.property('Author');
        expect(mock.models).to.have.property('Article');
        expect(mock.models).to.have.property('ArticleInfo');
        expect(mock.models).to.have.property('Tag');
    });

    it('should create sqlite instance', function (done) {
        mock.sequelize.sync().then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });
});

describe('saphyre data', function () {

    beforeEach(function (done) {
        mock.sequelize.sync().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function () {
        var tagData = mock.data.tag;
        delete tagData.cache;
    });

    it('should return a page', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.requestList({
                projection : 'list',
                page : 1,
                pageSize : 10
            });
        }).then(function (result) {
            expect(result).to.have.property('page').equal(1);
            expect(result).to.have.property('pages').equal(1);
            expect(result).to.have.property('count').equal(1);
            expect(result).to.have.property('list').with.length(1);
            expect(result.list[0]).to.have.property('id');
            expect(result.list[0]).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(result.list[0]).to.have.property('date');

            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content'
            });
        }).then(function () {
            return articleData.requestList({
                projection : 'list',
                page : 2,
                pageSize : 1
            });
        }).then(function (result) {
            expect(result).to.have.property('page').equal(2);
            expect(result).to.have.property('pages').equal(2);
            expect(result).to.have.property('count').equal(2);
            expect(result).to.have.property('list').with.length(1);
            expect(result.list[0]).to.have.property('id');
            expect(result.list[0]).to.have.property('title').equal('THIS IS ANOTHER TITLE EXAMPLE');
            expect(result.list[0]).to.have.property('date');

            done();
        }).catch(done);
    });

    it('should return a single row', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.single({
                projection : 'list'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(article).to.have.property('date');

            done();
        }).catch(done);
    });

    it('should return a list', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.list({
                projection : 'list'
            });
        }).then(function (list) {
            expect(list).to.have.length(1);

            done();
        }).catch(done);
    });

    it('should cache', function (done) {
        var Tag = mock.models.Tag,
            tagData = mock.data.tag;

        expect(tagData.cache).to.not.exist;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return tagData.list();
        }).then(function (list) {
            expect(tagData.cache).to.exist;
            expect(tagData.cache).to.have.property('timestamp');
            expect(tagData.cache).to.have.property('result').to.be.equal(list);

            var timestamp = tagData.cache.timestamp;
            return tagData.list().then(function () {
                expect(tagData.cache).to.exist;
                expect(tagData.cache).to.have.property('timestamp').equal(timestamp);
            });
        }).then(function () {
            done();
        }).catch(done);
    });

    it('should handle cached data', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            articleData = mock.data.article;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return articleData.single({
                projection : 'all'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('this is a title example');
            expect(article).to.have.property('author').to.have.property('name').equal('the author');
            expect(article).to.have.property('tags').with.length(2);
            expect(article.tags[0]).to.have.property('name').equal('one');
            expect(article.tags[1]).to.have.property('name').equal('another');

            done();
        }).catch(done);
    });

    it('should handle cached data in sublists', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            return Article.bulkCreate([
                {
                    article_id : 1,
                    title : 'this is a title example',
                    content : 'this is the article content',
                    author_id : author.author_id
                },
                {
                    title : 'this is another title example',
                    content : 'this is another article content',
                    author_id : author.author_id
                }
            ]);
        }).then(function () {
            return Article.find(1);
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(2);
            expect(author.articles[0]).to.have.property('id');
            expect(author.articles[0]).to.have.property('title').equal('this is a title example');
            expect(author.articles[0]).to.have.property('tags').with.length(2);
            expect(author.articles[0].tags[0]).to.have.property('name').equal('one');
            expect(author.articles[0].tags[1]).to.have.property('name').equal('another');

            expect(author.articles[1]).to.have.property('id');
            expect(author.articles[1]).to.have.property('title').equal('this is another title example');
            expect(author.articles[1]).to.have.property('tags').with.length(0);

            done();
        }).catch(done);
    });

    it('should handle cached data in sublists, even when there`s none', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            authorData = mock.data.author;

        return Author.create({
            name : 'the author'
        }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(1);
            expect(author.articles[0]).to.have.property('id');
            expect(author.articles[0]).to.have.property('title').equal('this is a title example');
            expect(author.articles[0]).to.have.property('tags').with.length(0);

            done();
        }).catch(done);
    });

    it('should handle lists in sublists', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author,
            author_id;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            author_id = author.author_id;

            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return authorData.single({
                projection : 'article-tags'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articleTags').with.length(2);
            expect(author.articleTags[0]).to.have.property('id');
            expect(author.articleTags[0]).to.have.property('name').equal('one');
            expect(author.articleTags[1]).to.have.property('name').equal('another');

            done();
        }).catch(done);
    });

    it('should return no rows in sublists when there`s none', function (done) {
        var Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(0);

            done();
        }).catch(done);
    });

    it('should return no rows in sublists when there`s none, on belongsToMany assoc', function (done) {
        var Author = mock.models.Author,
            Article = mock.models.Article,
            articleData = mock.data.article;

        return Author.create({ name : 'the author' }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function () {
            return articleData.single({
                projection : 'tags-no-cache'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('this is a title example');
            expect(article).to.have.property('tags').with.length(0);

            done();
        }).catch(done);
    });

    it('should filter data using criterias', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function (article) {
            return articleData.single({
                projection : 'list',
                criteria : {
                    id : { id : article.article_id }
                }
            });
        }).then(function (article) {
            expect(article).to.exist.have.property('id');
            expect(article).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(article).to.have.property('date');

            return articleData.single({
                projection : 'list',
                criteria : {
                    id : { id : -1 }
                }
            });
        }).then(function (article) {
            expect(article).to.be.undefined;
            done();
        }).catch(done);
    });

    it('should filter logically removed rows', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article,
            article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function (newArticle) {
            article = newArticle;

            return articleData.list({
                projection: 'list'
            });
        }).then(function (articles) {
            expect(articles).with.length(1);
            return article.destroy();
        }).then(function () {
            return articleData.list({
                projection: 'list'
            });
        }).then(function (articles) {
            expect(articles).with.length(0);
            done();
        }).catch(done);
    });

    it('should throw error on unknown properties', function (done) {
        var articleData = mock.data.article,
            error;

        return articleData.single({
            projection : 'error'
        }).catch(function (err) {
            error = err;
        }).then(function () {
            expect(error).to.exist;
            done();
        });
    });

    it('should throw error on unregistered projection', function (done) {
        var articleData = mock.data.article,
            error;

        return articleData.single({
            projection : 'no-projection'
        }).catch(function (err) {
            error = err;
        }).then(function () {
            expect(error).to.exist;
            done();
        });
    });

    it('should left join associations', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.list({
                projection : 'with-info'
            });
        }).then(function (articles) {
            expect(articles).with.length(1);

            done();
        }).catch(done);
    });

    it('should count', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.bulkCreate([
            {
                title : 'this is a title example',
                content : 'this is the article content'
            },
            {
                title : 'this is another title example',
                content : 'this is the other article content'
            }
        ]).then(function () {
            return articleData.count();
        }).then(function (count) {
            expect(count).to.be.equal(2);

            return articleData.count({
                criteria : {
                    id : { id : 1 }
                }
            });
        }).then(function (count) {
            expect(count).to.be.equal(1);
            done();
        }).catch(done);
    });

    it('should criteria operation IS_NULL / IS_NOT_NULL', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.bulkCreate([
            {
                title : 'this is a title example',
                content : 'this is the article content'
            },
            {
                title : 'this is another title example',
                content : null
            }
        ]).then(function () {
            return articleData.list({
                projection: 'list',
                criteria : {
                    'with-content' : true
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');

            return articleData.list({
                projection: 'list',
                criteria : {
                    'without-content' : true
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS ANOTHER TITLE EXAMPLE');
            done();
        }).catch(done);
    });

});