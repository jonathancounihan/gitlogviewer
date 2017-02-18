/*
Main app file.
*/
var ChangeLog = function () {
    var self = {};

    self.IsLoading = ko.observable(false);

    self.Options = ko.observable({
        CommitUrlBase: '',
        IssueUrlBase: ''
    });

    self.UseVersionNumbers = ko.observable(false);
    self.UseHashIds = ko.observable(false);

    var allVersionedCommits = ko.observableArray([]);
    var allHashCommits = ko.observableArray([]);

    self.DevVersion = ko.observable('');
    self.TestVersion = ko.observable('');
    self.ProductionVersion = ko.observable('');

    self.HashIds = ko.observable({});

    var versionNumberRegx = /([0-9]*\.[0-9]*\.[0-9]*\.[0-9]*)/g;

    function processCommitsViaParents(data) {
        var newCommits = [];

        var length = data.length;
        var version = '0.0.0.0';

        for (var i = 0; i < length; i++) {
            var versionCheck = data[i];
            if (versionCheck.author.startsWith('Bob The Builder')) {
                var versionMatches = versionCheck.subject.match(versionNumberRegx);
                if (versionMatches) {
                    version = versionMatches[1];
                    break;
                }
            }
        }

        function updateVersion(item) {
            if (!item.version) {
                item.version = version;
            }
        }

        function findParentCommits(parentHashes) {
            return ko.utils.arrayFilter(data, function (item) {
                return parentHashes.includes(item.hash);
            });
        }

        for (var j = 0; j < length; j++) {
            var d = data[j];
            if (d.author.startsWith('Bob The Builder')) {
                var matches = d.subject.match(versionNumberRegx);
                if (matches) {
                    version = matches[1];
                }

                d.version = version;
            }

            if (!d.version) {
                d.version = version;
            }

            var commit = CommitEntry(d, self.Options().CommitUrlBase, self.Options().IssueUrlBase);

            newCommits.push(commit);

            if (d.parents) {
                var parentHashes = d.parents.split(' ');

                var parentCommits = findParentCommits(parentHashes);

                ko.utils.arrayForEach(parentCommits, updateVersion);
            }
        }

        return newCommits;
    }

    self.SetCommitDatasource = function (data) {
        self.IsLoading(true);

        var newCommits = processCommitsViaParents(data);

        newCommits.sort(function (a, b) {
            var A = moment(a.date);
            var B = moment(b.date);

            if (A < B) return 1;
            if (A > B) return -1;
            return 0;
        });

        allVersionedCommits(newCommits);

        allHashCommits(newCommits);

        self.IsLoading(false);
    };

    self.DownloadData = function () {
        var data = ko.toJSON(allVersionedCommits);

        var blob = new Blob([data], { type: 'text/json' }),
            e = document.createEvent('MouseEvents'),
            a = document.createElement('a')

        a.download = 'GitChangeLogData.json';
        a.href = window.URL.createObjectURL(blob);
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        a.dispatchEvent(e);
    };

    function filterCommitsBasedOnVersion(commitarr, version) {
        var commits = Enumerable.From(commitarr())
            .Where(function (x) {
                return compareVersions(version, x.version) > -1;
            })
            .ToArray();

        return commits;
    }

    function createVersionsArrayFromCommits(commitArr, devVersion, testVersion, productionVersion) {
        var versions = Enumerable.From(commitArr())
            .GroupBy(function (x) {
                return x.version;
            })
            .Select(function (x) {
                var versionNumber = x.Key();
                var versioncss = '';

                if (isALowerThanB(versionNumber, productionVersion)) {
                    versioncss = 'version-production';
                }
                else if (isALowerThanB(versionNumber, testVersion)) {
                    versioncss = 'version-test';
                }
                else {
                    versioncss = 'version-dev';
                }

                var commitCount = '(' + x.source.length.toString() + ' ' + (x.source.length === 1 ? 'commit' : 'commits') + ')';

                return {
                    version: versionNumber,
                    date: x.source.length > 0 ? x.source[0].date : null,
                    commits: x.source,
                    CommitCount: commitCount,
                    versioncss: versioncss
                };
            })
            .OrderByDescending(function (s) {
                return s.version;
            })
            .ToArray();

        return versions;
    }

    self.HashCommits = ko.computed({
        deferEvaluation: true,
        read: function () {

            var commits = Enumerable.From(allHashCommits())
                .Where(function (x) { return !x.subject.startsWith('Merge'); })
                .Select(function (x) { return x; })
                .ToArray();

            return commits;
        }
    });

    self.HashCommitsVersion = ko.computed({
        deferEvaluation: true,
        read: function () {

            return createVersionsArrayFromCommits(self.HashCommits, '0.0.0.0', '0.0.0.0', '0.0.0.0');
        }
    });

    self.DevCommits = ko.computed({
        deferEvaluation: true,
        read: function () {

            var commits = Enumerable.From(allVersionedCommits())
                .Where(function (x) { return !x.subject.startsWith('Merge'); })
                .Select(function (x) { return x; })
                .ToArray();

            return commits;
        }
    });

    self.TestCommits = ko.computed({
        deferEvaluation: true,
        read: function () {
            return filterCommitsBasedOnVersion(self.DevCommits, self.TestVersion());
        }
    });

    self.ProductionCommits = ko.computed({
        deferEvaluation: true,
        read: function () {
            return filterCommitsBasedOnVersion(self.DevCommits, self.ProductionVersion());
        }
    });

    self.DevVersions = ko.computed({
        deferEvaluation: true,
        read: function () {
            return createVersionsArrayFromCommits(self.DevCommits, self.DevVersion(), self.TestVersion(), self.ProductionVersion());
        }
    });

    self.TestVersions = ko.computed({
        deferEvaluation: true,
        read: function () {
            return createVersionsArrayFromCommits(self.TestCommits, self.DevVersion(), self.TestVersion(), self.ProductionVersion());
        }
    });

    self.ProductionVersions = ko.computed({
        deferEvaluation: true,
        read: function () {
            return createVersionsArrayFromCommits(self.ProductionCommits, self.DevVersion(), self.TestVersion(), self.ProductionVersion());
        }
    });

    self.ChangesAheadOfTest = ko.computed({
        deferEvaluation: true,
        read: function () {
            return 'Changes Ahead Of Test: ' + (self.DevCommits().length - self.TestCommits().length).toString();
        }
    });
    self.ChangesAheadOfProduction = ko.computed({
        deferEvaluation: true,
        read: function () {
            return 'Changes Ahead Of Live: ' + (self.TestCommits().length - self.ProductionCommits().length).toString();
        }
    });

    function compareVersions(a, b) {
        var i, diff;
        var regExStrip0 = /(\.0+)+$/;
        var segmentsA = a.replace(regExStrip0, '').split('.');
        var segmentsB = b.replace(regExStrip0, '').split('.');
        var l = Math.min(segmentsA.length, segmentsB.length);

        for (i = 0; i < l; i++) {
            diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
            if (diff) {
                return diff;
            }
        }
        return segmentsA.length - segmentsB.length;
    }

    function isALowerThanB(a, b) {
        return compareVersions(a, b) < 0 || compareVersions(a, b) === 0;
    }

    return self;
};

var trelloRegEx = /https:\/\/trello.com\/\S\/([^\s|<]+)/g;
var issueNumberEx = /#([0-9]*)/g;

var CommitEntry = function (data, commitUrlBase, issueUrlBase) {
    var self = {};

    self.shorthashId = data.shorthashId;
    self.hash = data.hash;
    self.parents = data.parents;
    self.tree = data.tree;

    self.subject = data.subject;
    self.author = data.author;
    self.version = data.version;
    self.date = data.date;

    self.commitUrl = ko.computed(function () {
        var url = commitUrlBase + data.hash;
        return url;
    });

    self.HtmlBody = ko.computed(function () {
        var html = '';
        if (data.body) {
            html = data.body.replace(/(\\n)+/g, '<br />');

            var trelloMatches = html.match(trelloRegEx);

            if (trelloMatches) {
                trelloMatches.forEach(function (trelloUrl) {
                    html = html.replace(trelloUrl, '<a href="' + trelloUrl + '" target"_blank">' + trelloUrl + '</a>');
                });
            }

            var issueNumberMatches = html.match(issueNumberEx);

            if (issueNumberMatches) {
                issueNumberMatches.forEach(function (issueNumber) {
                    var number = issueNumber.substring(1, issueNumber.length);
                    var issueUrl = issueUrlBase + number;

                    html = html.replace(issueNumber, '<a href="' + issueUrl + '" target"_blank">' + issueNumber + '</a>');
                });
            }
        }
        return html;
    });

    return self;
};