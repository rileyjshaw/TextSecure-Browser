var Whisper = Whisper || {};

(function () {
  'use strict';

  Whisper.ConversationListItemView = Backbone.View.extend({
    tagName: 'div',
    className: 'contact',

    events: {
      'click': 'open',
    },
    initialize: function() {
      this.template = $('#contact').html();
      Mustache.parse(this.template);

      this.listenTo(this.model, 'change', this.render); // auto update
      this.listenTo(this.model, 'destroy', this.remove); // auto update
      this.listenTo(this.model, 'render', this.open);
    },

    open: function(e) {
      this.$el.addClass('selected');

      if (!this.view) {
        this.view = new Whisper.ConversationView({ model: this.model });
      }
      this.model.collection.trigger('selected', this.view);
    },

    render: function() {
      this.$el.html(
        Mustache.render(this.template, {
          contact_name: this.model.get('name') || this.model.get('members') || this.model.id,
          last_message: this.model.get('lastMessage'),
          last_message_timestamp: moment(this.model.get('timestamp')).format('MMM D')
        })
      );
      if (this.model.get('avatar')) {
        this.$el.find('.avatar').append(
          new Whisper.AttachmentView({model: this.model.get('avatar')}).render().el
        );
      }
      else {
        this.$el.find('.avatar').append(
            $('<img>').attr('src', '/images/default.png')
        );
      }

      return this;
    }

  });
})();
