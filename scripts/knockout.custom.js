
var Utils = Utils || {};

Utils.FormatDate = function (dateValue, dateFormat, defaultValue) {
    var momentDate = moment(dateValue);

    var formattedValue = defaultValue || '';

    if (momentDate.isValid()) {
        formattedValue = momentDate.format(dateFormat);
    }

    return formattedValue;
};

ko.bindingHandlers.hidden = {
    update: function (element, valueAccessor) {
        ko.bindingHandlers.visible.update(element, function () {
            return !ko.utils.unwrapObservable(valueAccessor());
        });
    }
};

/*
Subscribe change, so you can get the new and old value.
use it like this:
MyViewModel.MyObservableProperty.subscribeChanged(function (newValue, oldValue) {
  // Do something here with both old and new values.
});
*/
ko.subscribable.fn.subscribeChanged = function (callback) {
    var savedValue = this.peek();
    return this.subscribe(function (latestValue) {
        var oldValue = savedValue;
        savedValue = latestValue;
        callback(latestValue, oldValue);
    });
};

ko.bindingHandlers.versiondatetime = {
    update: function (element, valueAccessor, allBindingsAccessor) {

        var value = ko.utils.unwrapObservable(valueAccessor());

        var formattedValue = Utils.FormatDate(value, 'YYYY/MM/DD HH:mm', null);

        ko.bindingHandlers.text.update(element, function () {
            return formattedValue;
        });
    }
};