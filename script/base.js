/**
 * 基类
 */
class base {

    constructor(_api = null, _params = {}) {
        if (null === _api) {
            alert('启动错误,请传入api对象');
            return false;
        }
        this.appApi = _api;

        // 显示调试信息
        this.showDebug = 'undefined' == typeof (_params.debug) ? false : _params.debug;
        // 滚动事件底部间距
        this.threshold = 'undefined' == typeof (_params.threshold) ? 10 : _params.threshold;
        // 超时
        this.timeout = 'undefined' == typeof (_params.timeout) ? 300 : _params.timeout;
        // 支持版本
        this.version = 'undefined' == typeof (_params.version) ? { android: 8, ios: 11 } : _params.version;

        this.api = {
            appid: 'undefined' == typeof (_params.api.appid) ? '1000001' : _params.api.appid,
            appsecret: 'undefined' == typeof (_params.api.appsecret) ? '' : _params.api.appsecret,
            version: 'undefined' == typeof (_params.api.version) ? '1.2.1' : _params.api.version,
            cache_open: true,
            cache_expire: 1140,
        };

        // APP版本支持
        let ver = this.appApi.systemVersion.split('.');
        ver = parseInt(ver[0]);
        if (ver < this.version[this.appApi.systemType]) {
            this.toast(this.appApi.systemType + '版本过低,需要' + this.version[this.appApi.systemType] + '+,请升级后重新打开.', 3);
            let self = this;
            setTimeout(function () {
                self.appApi.closeWidget({
                    id: self.appApi.appId,
                    silent: true
                });
            }, 3000);
        }

        if ('none' == this.appApi.connectionType) {
        }
    };

    /**
     * 异步请求
     * https://docs.apicloud.com/Client-API/api#3
     * @param 参考ajax方法
     * @param function _callback 回调方法
     */
    pjax(_params, _callback) {
        let sign = this.sign(_params.data.values);

        if ('undefined' !== typeof (_params.data.files)) {
            _params.method = 'post';
        }

        // mehtod为get时不传值, _params.data.values无效
        // 进行URL拼接达到传值效果
        if ('get' === _params.method || 'GET' === _params.method) {
            if (-1 === _params.url.indexOf('?')) {
                _params.url += '?';
            }
            for (let index in _params.data.values) {
                const element = _params.data.values[index];
                _params.url += '&' + index + '=' + element;
            }
            _params.url += '&sign=' + sign;
        } else {
            _params.data.values.sign = sign;
        }

        this.debug(_params);

        // 缓存标识符
        let cache_key = this.md5(_params.data.values);
        let result = this.cache(cache_key);
        if (result && _params.method == 'get') {
            framework.debug('[缓存请求]');
            _callback(result);
        } else {
            this.debug('网络请求');
            let self = this;
            this.appApi.ajax(_params, function (result, error) {
                // 隐藏进度提示框
                self.appApi.hideProgress();
                // 恢复下拉刷新提示框
                self.appApi.refreshHeaderLoadDone();
                if (error) {
                    self.toast(error.statusCode + ':请求错误', 1.5);
                    self.debug(error);
                }
                if ('undefined' != typeof (_params.rcache) && true === _params.rcache) {
                    self.debug('[写入缓存]');
                    self.cache(cache_key, result);
                }
                _callback(result);
            });
        }
    };

    sign(_params) {
        // 先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
        var newkey = Object.keys(_params).sort();

        // 创建一个新的对象，用于存放排好序的键值对
        var newObj = {};
        for (var i = 0; i < newkey.length; i++) {
            // 遍历newkey数组
            newObj[newkey[i]] = _params[newkey[i]];
            // 向新创建的对象中按照排好的顺序依次增加键值对
        }

        var sign = '';
        for (var index in newObj) {
            if (typeof (newObj[index]) != 'undefined' && index != 'content' && index != 'sign') {
                sign += index + '=' + newObj[index] + '&';
            }
        }
        sign = sign.substr(0, sign.length - 1);
        sign += this.api.appsecret;
        this.debug(sign);
        sign = this.md5(sign);

        return sign;
    };

    /**
     * 加载更多
     * @param string   _type top下拉刷新 scroll滚动底部加载
     * @param function _callback 回调方法
     */
    more(_type, _callback) {
        if ('top' == _type) {
            this.appApi.setRefreshHeaderInfo({
                loadingImg: 'widget://image/refresh.png',
                bgColor: '#fff',
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

    /**
     * 清空缓存
     */
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
    };

    /**
     * 更新
     * 云修复
     * 版本更新
     */
    update() {
        let self = this;
        this.event('smartupdatefinish', function () {
            self.appApi.rebootApp();
        });

        let mam = this.appApi.require('mam');
        mam.checkUpdate(function (res, err) {
            self.appApi.confirm({
                title: '有新的版本,是否下载并安装 ',
                msg: '新版本:' + res.result.version + '发布时间:' + res.result.time,
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

    /**
     * 断网
     * @param function _offline 断网回调方法
     * @param function _online  恢复回调方法
     */
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

    /**
     * 返回按键
     */
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

    /**
     * 事件
     * @param string   _type
     * @param function _callback 回调方法
     */
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

    selectGroup(_params) {
        _params.reload = 'undefined' == typeof (_params.reload) ? false : _params.reload;
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
            y: 'undefined' == typeof (_params.top) ? this.appApi.safeArea.top : _params.top,
            w: this.appApi.winWidth,
            h: 'undefined' == typeof (_params.foot) ? this.appApi.winHeight : this.appApi.winHeight - _params.foot,
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
        _params.reload = 'undefined' == typeof (_params.reload) ? true : _params.reload;
        _params.rect = {
            x: 0,
            y: 'undefined' == typeof (_params.top) ? this.appApi.safeArea.top : _params.top,
            w: this.appApi.winWidth,
            h: 'undefined' == typeof (_params.foot) ? this.appApi.winHeight : this.appApi.winHeight - _params.foot,
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
    };

    cache(_name, _value = '', _expire = null) {
        _expire = null === _expire ? this.api.cache_expire : _expire;

        let self = this;
        if (false === this.api.cache_open) {
            this.appApi.clearCache(function () {
                self.debug('清空缓存');
            });
            return false;
        }

        // 清空缓存
        if (_name === null) {
            this.appApi.clearCache(function () {
                self.debug('清空缓存');
            });

            return true;
        }
        // 获得缓存数据
        else if (_value === '') {
            var _name = this.md5(_name);

            var data = this.appApi.readFile({
                sync: true,
                path: 'cache://' + _name + '.json',
            });
            if (data) {
                data = JSON.parse(data);
                if (data.expire == 0 || data.expire >= this.timestamp()) {
                    return data.value;
                }
            } else {
                return false;
            }
        }
        // 写入缓存
        else {
            _expire = 0 === _expire ? _expire : this.timestamp() + _expire;

            var _name = this.md5(_name);
            this.appApi.writeFile({
                path: 'cache://' + _name + '.json',
                data: JSON.stringify({
                    expire: _expire,
                    value: _value
                })
            }, function (ret, err) {

            });
            return _value;
        }
    };

    userCache(_name, _value = '') {
        if ('undefined' == typeof (_name)) {
            return false;
        }

        // 删除缓存
        if (null === _value) {
            this.appApi.removePrefs({ key: _name });
            return true;
        }
        // 获得缓存数据
        else if ('' === _value) {
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
        let str = '';
        if ('object' === typeof (_data)) {
            for (var index in _data) {
                str += index + this.md5(_data[index]);
            }
        }
        else if ('function' !== typeof (_data)) {
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
                this.appApi.alert(_log);
            }
        }
    };
};
