class App {
    constructor(_api = null, _params = {}) {
        if (null === _api) {
            alert('启动错误,请传入api对象');
            return false;
        }
        this.appApi = _api;
        this.showDebug = typeof(_params.debug) == 'undefined' ? false : _params.debug;
        this.threshold = typeof(_params.threshold) == 'undefined' ? 10 : _params.threshold;
        this.timeout = typeof(_params.timeout) == 'undefined' ? 300 : _params.timeout;

        // if ('android' == this.appApi.systemType) {

        // }
        // else if ('ios' == this.appApi.systemType) {

        // }

        // this.appApi.closeWidget({
        //     id: self.appApi.appId,
        //     silent: true
        // });

        this.debug('启动');

        if ('none' == this.appApi.connectionType) {
        }
    };

    pjax(_params, _callback) {
        let self = this;
        api.ajax(_params, function (ret, err) {
            self.appApi.hideProgress();
            self.appApi.refreshHeaderLoadDone();
            _callback(ret, err);
        });
    };

    more(_type, _callback) {
        if ('top' == _type) {
            this.appApi.setRefreshHeaderInfo({
                loadingImg: 'widget://image/refresh.png',
                bgColor: '#ccc',
                textColor: '#fff',
                textDown: '下拉刷新...',
                textUp: '松开刷新...'
            }, function (res, err) {
                _callback(res, err);
            });
        } else if ('scroll' == _type) {
            this.event('scrolltobottom', function (res, err) {
                _callback(res, err);
            });
        }
    };

    removeCache() {
        let self = this;
        this.appApi.getCacheSize(function (res) {
            if (res.size > 0) {
                let size = res.size / 1048576;
                size = size.toFixed(2);
                size = size <= 0 ? 0.01 : size;
                self.appApi.confirm({
                    title: '当前缓存为:' + size + 'MB',
                    msg: '您确定要清除缓存吗?',
                    buttons: ['确定', '取消']
                }, function (res, err) {
                    if (res.buttonIndex == 1) {
                        self.appApi.clearCache(function () {
                            this.toast('缓存已清空');
                        });
                    }
                });
            } else {
                self.toast('缓存已清空');
            }
        });
    }

    update() {
        let self = this;

        this.event('smartupdatefinish', function () {
            self.appApi.rebootApp();
        });

        let mam = this.appApi.require('mam');
        mam.checkUpdate(function (res, err) {
            self.appApi.confirm({
                title: '有新的版本,是否下载并安装 ',
                msg: '新版本型号:' + res.result.version + '发布时间:' + res.result.time,
                buttons: ['确定', '取消']
            }, function (r, err) {
                if (r.buttonIndex == 1) {
                    if ('android' == self.appApi.systemType) {
                        self.appApi.download({
                            url: res.result.source,
                            report: true
                        }, function (ret, err) {
                            if (ret && 0 == ret.state) {
                                self.appApi.toast('正在下载应用' + ret.percent + '%');
                            } else if (ret && 1 == ret.state) {
                                self.appApi.installApp({
                                    appUri: ret.savePath
                                });
                            }
                        });
                    } else if ('ios' == self.appApi.systemType) {
                        self.appApi.installApp({
                            appUri: ret.result.source
                        });
                    }
                }
            });
        });
    };

    network(_offline, _online) {
        let self = this;
        this.event('online', function () {
            let winHistory = self.userCache('winHistory');
            if (winHistory && winHistory.length) {
                let open = winHistory[winHistory.length - 1];
                if ('frame' == self.ext(open)) {
                    self.open({
                        name: self.name(open),
                        reload: true
                    });
                } else {
                    let index = self.userCache(self.name(open) + 'GroupIndex');
                    self.selectGroup({
                        name: self.name(open),
                        index: index,
                        reload: true
                    });
                }
            }
            _online();
        });

        this.event('offline', function () {
            self.toast('网络错误,请检查网络.');
            _offline();
        });
    };

    back() {
        let self = this;
        self.backCloseNum = 1;
        this.event('keyback', function () {
            // 获得窗口历史记录
            let winHistory = self.userCache('winHistory');
            if (winHistory && winHistory.length) {
                let close = winHistory[winHistory.length - 1];
                if ('frame' == self.ext(close)) {
                    self.close(self.name(close));
                } else {
                    self.closeGroup(self.name(close));
                }
            } else {
                if (self.backCloseNum >= 2) {
                    self.appApi.closeWidget({
                        id: self.appApi.appId,
                        silent: false,
                        retData: {
                            name: 'closeApp'
                        },
                        silent: true
                    });
                } else {
                    self.backCloseNum++;
                    self.toast('再按一次退出程序');
                }
                setTimeout(function () {
                    self.backCloseNum = 1;
                }, 1000);
            }
        });
    };

    event(_type, _callback) {
        this.appApi.addEventListener({
            name: _type,
            extra: {
                threshold: this.threshold,
                timeout: this.timeout,
            }
        }, function (ret, err) {
            _callback();
        });
    };

    selectGroup = function (_params) {
        _params.reload = typeof (_params.reload) == 'undefined' ? false : _params.reload;
        this.appApi.setFrameGroupIndex(_params);
    };

    closeGroup(_name) {
        this.history(_name + '.group', 'close');
        this.appApi.closeFrameGroup({ name: _name });
    };

    openGroup(_params) {
        this.history(_params.name + '.group', 'open');

        _params.rect = {
            x: 0,
            y: typeof (_params.top) == 'undefined' ? this.appApi.safeArea.top : _params.top,
            w: this.appApi.winWidth,
            h: typeof (_params.foot) == 'undefined' ? this.appApi.winHeight : this.appApi.winHeight - _params.foot,
            marginLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            marginRight: 0
        };
        let self = this;
        self.userCache(_params.name + 'GroupIndex', 0);
        this.appApi.openFrameGroup(_params, function (res, err) {
            self.userCache(_params.name + 'GroupIndex', res.index);
            _params.success(res, err);
        });
    };

    close(_name) {
        this.debug('关闭:' + _name);
        this.history(_name + '.frame', 'close');
        this.appApi.closeFrame({ name: _name });
    };

    open(_params) {
        this.debug('打开' + _params.name);
        this.history(_params.name + '.frame', 'open');

        if ('undefined' != typeof (_params.url)) {
            _params.url = 'widget://html/' + _params.url;
        }
        _params.reload = typeof (_params.reload) == 'undefined' ? true : _params.reload;
        _params.rect = {
            x: 0,
            y: typeof (_params.top) == 'undefined' ? this.appApi.safeArea.top : _params.top,
            w: this.appApi.winWidth,
            h: typeof (_params.foot) == 'undefined' ? this.appApi.winHeight : this.appApi.winHeight - _params.foot,
            marginLeft: 0,
            marginTop: 0,
            marginBottom: 0,
            marginRight: 0
        };

        this.appApi.openFrame(_params);
    };

    toast(_msg, _time = 3) {
        this.appApi.toast({ msg: _msg, duration: _time * 1000, location: 'middle' });
    };

    history(_name, _type = 'open') {
        // 获得窗口历史
        // 如果没有历史则新建历史记录
        let winHistory = this.userCache('winHistory');
        if (false === winHistory) {
            winHistory = [];
        }

        // 保存新打开窗口记录
        if (winHistory && 'open' == _type) {
            for (var index in winHistory) {
                if (winHistory[index] == _name) {
                    return false;
                }
            }
            winHistory.push(_name);
        }
        // 删除关闭窗口记录
        else if (winHistory && 'close' == _type) {
            let new_win = [];
            for (var index in winHistory) {
                if (winHistory[index] != _name) {
                    new_win.push(_name);
                }
            }
            winHistory = new_win;
        }

        // 重新记录历史信息
        this.userCache('winHistory', winHistory);

        // 返回窗口历史记录
        return winHistory;
    }

    userCache(_name, _value = '', _expire = 0) {
        if ('undefined' == typeof (_name)) {
            return false;
        }

        // 删除缓存
        if (_value === null) {
            this.appApi.removePrefs({ key: _name });
            return true;
        }
        // 获得缓存数据
        else if (_value === '') {
            var data = this.appApi.getPrefs({ sync: true, key: _name });
            if (!!data) {
                return JSON.parse(data);
            } else {
                return false;
            }
        }
        // 设置缓存
        else if (_value) {
            this.appApi.setPrefs({ key: _name, value: JSON.stringify(_value) });
            return _value;
        }
    };

    timestamp() {
        var timestamp = Date.parse(new Date());
        return timestamp / 1000;
    };

    md5(_data) {
        let str = this.appApi.systemType + this.appApi.deviceId + this.appApi.deviceModel + this.appApi.deviceName;
        if (typeof (_data) === 'object') {
            for (var index in _params) {
                str += index + this.md5(_params[index]);
            }
        }
        else if (typeof (_data) !== 'function') {
            str += _data;
        }

        let signature = this.appApi.require('signature');
        let str_md5 = signature.md5Sync({
            data: str,
            uppercase: false
        });

        return str_md5;
    };

    ext = function (_name) {
        _name = _name.toString();
        return _name.substring(_name.lastIndexOf('.') + 1, _name.length);
    };

    name = function (_name) {
        _name = _name.toString();
        return _name.substring(0, _name.lastIndexOf('.'));
    };

    debug = function (_log, _type = 'console') {
        if (true == this.showDebug) {
            if ('console' == _type) {
                console.log(JSON.stringify(_log));
            } else {
                this.appApi.alert(JSON.stringify(_log));
            }
        }
    };
};
