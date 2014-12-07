/* vim: ts=4:sw=4:expandtab
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

;(function() {
    'use strict';

    function init() {
        if (!localStorage.getItem('first_install_ran')) {
            localStorage.setItem('first_install_ran', 1);
            extension.navigator.tabs.create("options.html");
        } else {
            if (textsecure.registration.isDone()) {
                var events = _.extend({}, Backbone.Events);
                var conversations = new Whisper.ConversationCollection();
                events.on('message', function(message) {
                    conversations.addIncomingMessage(message).then(function(message) {
                        // notify frontend listeners
                        extension.trigger('message', message);
                    });
                    console.log(
                        "Got message from",
                        message.pushMessage.source + "." + message.pushMessage.sourceDevice);
                    if (message.message) {
                        console.log(getString(message.message.body));
                    }
                    var newUnreadCount = textsecure.storage.getUnencrypted("unreadCount", 0) + 1;
                    textsecure.storage.putUnencrypted("unreadCount", newUnreadCount);
                    extension.navigator.setBadgeText(newUnreadCount);
                });
                events.on('receipt', function(message) {
                    console.log('delivery receipt for message ' + message.timestamp);
                    //TODO: look up the message by [source, timestamp] and mark delivered
                });
                textsecure.subscribeToPush(events);
            }
        }
    };

    textsecure.registration.addListener(init);
    init();
})();
