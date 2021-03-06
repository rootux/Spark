var bookshelf = require('../libs/db').bookshelf;
var bcrypt = require('bcrypt-nodejs');
var randtoken = require('rand-token');
var NpoMember = require('./npo_member').NpoMember;
var constants = require('./constants.js');
var userRole = require('../libs/user_role');
const knex = require('../libs/db').knex;

var User = bookshelf.Model.extend({
    tableName: constants.USERS_TABLE_NAME,
    idAttribute: 'user_id',
    npoMember: function () {
        return this.hasMany(NpoMember);
    },

    generateHash: function (password) {
        this.attributes.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    },

    generateValidation: function () {
        var date = new Date();
        var offset = (24 * 60 * 60 * 1000); // hours*minutes*seconds*millis
        date.setTime(date.getTime() + offset);

        this.attributes.email_validation_expires = date.toISOString().slice(0, 19).replace('T', ' ');
        this.attributes.email_validation_token = randtoken.generate(32);
    },

    validate: function () {
        var expires = new Date(this.attributes.email_validation_expires);
        if (expires.getTime() > Date.now()) {
            this.attributes.validated = true;
            this.attributes.email_validation_token = null;
            this.attributes.email_validation_expires = null;
            return true;
        }
        return false;
    },
    /**
     * get this.user_id camps he is in for the CURRENT_EVENT_ID, executing function done.
     */
    getUserCamps: function (done) {
        var _camps_members = constants.CAMP_MEMBERS_TABLE_NAME;
        var _camps = constants.CAMPS_TABLE_NAME;
        var _this_user = this;
        knex(_camps)
            .select(_camps + '.*', _camps_members + '.status AS member_status')
            .innerJoin(_camps_members, _camps + '.id', _camps_members + '.camp_id')
            .where({ user_id: this.attributes.user_id, event_id: constants.CURRENT_EVENT_ID })
            .then((camps) => {
                var first_camp;
                var is_manager = false;
                var member_type_array = ['approved', 'pending', 'mgr_pending', 'approved_mgr', 'supplier'];
                for (var i in camps) {
                    if (!first_camp && member_type_array.indexOf(camps[i].member_status) > -1) {
                        first_camp = camps[i];
                    }
                    if ((camps[i].main_contact === this.attributes.user_id && camps[i].member_status === 'approved') ||
                        camps[i].member_status === 'approved_mgr') {
                        first_camp = camps[i];
                        is_manager = true;
                        break;
                    }
                }
                _this_user.attributes.camps = camps;
                _this_user.attributes.camp = first_camp;
                _this_user.attributes.camp_manager = is_manager;
                done(camps);
            });
    },

    validPassword: function (password) {
        return bcrypt.compareSync(password, this.attributes.password);
    },

    hasRole: function (role) {
        return (this.attributes.roles && this.attributes.roles.split(',').indexOf(role) > -1);
    },

    virtuals: {
        fullName: function () {
            return this.attributes.first_name + ' ' + this.attributes.last_name;
        },

        isAdmin: function () {
            return this.hasRole(userRole.ADMIN);
        },

        isCampManager: function () {
            return this.attributes.camp_manager===true;
        },

        isCampFree: function () {
            return (!this.attributes.camp);
        },

        isCampJoinPending: function () {
            return Number(this.attributes.camp_id) === -1
        }
    }
});

var DrupalUser = bookshelf.Model.extend({
    tableName: constants.DRUPAL_USERS_TABLE_NAME,

    validPassword: function (password) {
        var child_process = require('child_process');
        var res = child_process.execFileSync('python', ["libs/drupal_7_pw.py", this.attributes.pass], { 'input': password + "\n" });
        msg = res.toString('ascii');
        return (msg.indexOf('Yey! win') > -1);
    }
});

// Create the model and expose it
module.exports = {
    User: User,
    DrupalUser: DrupalUser
};
