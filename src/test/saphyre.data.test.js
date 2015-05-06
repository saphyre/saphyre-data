var chai   = require('chai'),
    expect = chai.expect,
    mock = require('./mocks/db.mock');

describe('this test', function () {
    it('should have 3 models', function () {
        expect(mock.models).to.have.property('Author');
        expect(mock.models).to.have.property('Article');
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

describe('saphyreData', function () {

    it('should return a page', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        mock.sequelize.sync().then(function () {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content'
            });
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

        mock.sequelize.sync().then(function () {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content'
            });
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

        mock.sequelize.sync().then(function () {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content'
            });
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

        mock.sequelize.sync().then(function () {
            return Tag.bulkCreate([
                { name : 'one' },
                { name : 'another' }
            ]);
        }).then(function () {
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
            articleData = mock.data.article,
            tagData = mock.data.tag;

        mock.sequelize.sync().then(function () {
            return Tag.bulkCreate([
                { name : 'one' },
                { name : 'another' }
            ]);
        }).then(function () {
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

            delete tagData.cache;
            done();
        }).catch(done);
    });

    it('should handle cached data in sublists', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author,
            tagData = mock.data.tag;

        mock.sequelize.sync().then(function () {
            return Tag.bulkCreate([
                { name : 'one' },
                { name : 'another' }
            ]);
        }).then(function () {
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
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(1);
            expect(author.articles[0]).to.have.property('id');
            expect(author.articles[0]).to.have.property('title').equal('this is a title example');
            expect(author.articles[0]).to.have.property('tags').with.length(2);
            expect(author.articles[0].tags[0]).to.have.property('name').equal('one');
            expect(author.articles[0].tags[1]).to.have.property('name').equal('another');

            delete tagData.cache;
            done();
        }).catch(done);
    });

    it('should handle cached data in sublists, even when there`s none', function (done) {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            authorData = mock.data.author,
            tagData = mock.data.tag;

        mock.sequelize.sync().then(function () {
            return Author.create({
                name : 'the author'
            });
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

            delete tagData.cache;
            done();
        }).catch(done);
    });

    it('should return no rows in sublists when there`s none', function (done) {
        var Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author,
            tagData = mock.data.tag;

        mock.sequelize.sync().then(function () {
            return Tag.bulkCreate([
                { name : 'one' },
                { name : 'another' }
            ]);
        }).then(function () {
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

            delete tagData.cache;
            done();
        }).catch(done);
    });

    it('should filter data using criterias', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        mock.sequelize.sync().then(function () {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content'
            });
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

    it('should left join subassociations', function (done) {
        // TODO verificar se as subassociações de uma associação LEFT também serão LEFT
        // TODO o que indica ser LEFT é o hasOne (belongsTo é INNER)
        done();
    });

});