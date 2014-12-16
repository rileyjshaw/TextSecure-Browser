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
(function () {
  'use strict';

   window.Whisper = window.Whisper || {};

  var Conversation = Whisper.Conversation = Backbone.Model.extend({
    database: Whisper.Database,
    storeName: 'conversations',
    defaults: function() {
      var timestamp = new Date().getTime();
      return {
        name        : 'New Conversation',
        image       : '/images/default.png',
        unreadCount : 0,
        timestamp   : timestamp,
        active_at   : timestamp
      };
    },

    initialize: function() {
        this.messageCollection = new Whisper.MessageCollection();
    },

    validate: function(attributes, options) {
      var required = ['type', 'timestamp', 'image', 'name'];
      var missing = _.filter(required, function(attr) { return !attributes[attr]; });
      if (missing.length) { return "Conversation must have " + missing; }
    },

    sendMessage: function(message, attachments) {
        var now = Date.now();
        this.messageCollection.add({
            body           : message,
            conversationId : this.id,
            type           : 'outgoing',
            attachments    : attachments,
            sent_at        : now,
            received_at    : now
        }).save();

        this.save({
            unreadCount : 0,
            active_at   : now
        });

        // TODO: extract the true outgoing timestamp sent to the server and
        // update sent_at. It's currently set in sendmessage.js:L59. Until
        // this happens delivery receipts will not be processed correctly.
        return textsecure.messaging.sendMessageToNumber(this.get('id'), message, attachments);
    },

    fetchMessages: function(options) {
        options = options || {};
        options.index = {
            // 'conversation' index on conversationId
            // WHERE conversationId = this.id ORDER received_at DESC
            name  : 'conversation',
            lower : [this.id],
            upper : [this.id, Number.MAX_VALUE],
            order : 'desc'
        };
        return this.messageCollection.fetch(options);
        // TODO pagination/infinite scroll
        // limit: 10, offset: page*10,
    },

    archive: function() {
        this.unset('active_at');
    },

    destroyMessages: function() {
        var models = this.messageCollection.models;
        this.messageCollection.reset([]);
        _.each(models, function(message) { message.destroy(); });
        this.archive();
        return this.save();
    }
  });

  Whisper.ConversationCollection = Backbone.Collection.extend({
    database: Whisper.Database,
    storeName: 'conversations',
    model: Conversation,

    comparator: function(m) {
      return -m.get('timestamp');
    },

    createGroup: function(recipients, name) {
      var attributes = {};
      attributes = {
        name      : name,
        members   : recipients,
        type      : 'group',
      };
      var conversation = this.add(attributes, {merge: true});
      return textsecure.messaging.createGroup(recipients, name).then(function(groupId) {
        conversation.save({
          id      : getString(groupId),
          groupId : getString(groupId)
        });
        return conversation;
      });
    },

    findOrCreateForRecipient: function(recipient) {
      var attributes = {};
      attributes = {
        id        : recipient,
        name      : recipient,
        type      : 'private',
      };
      var conversation = this.add(attributes, {merge: true});
      conversation.save();
      return conversation;
    },

    destroyAll: function () {
        return Promise.all(this.models.map(function(m) {
            return new Promise(function(resolve, reject) {
                m.destroy().then(resolve).fail(reject);
            });
        }));
    }
  });
})();
