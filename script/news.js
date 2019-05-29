class news extends base {
    constructor(_api = null, _params = {}) {
        super(_api, _params);
    }

    list() {
        let self = this;
        this.pjax({
            url: 'http://www.51xueba.com/api/query.html',
            method: 'get',
            rcache: false,
            data: {
                values: {
                    appid: self.api.appid,
                    version: self.api.version,
                    method: 'news.like.news',
                    page: 1,
                }
            }
        }, function (res) {
            self.debug(res);
        });
    }
}
