app.controller("campJoinController", function($scope, $http) {
    /**
     * Fetch camp list that are open to new members and within the current event
     * @return {json}     list with camp name & id
     */
    function _getOpenCamps() {
        $http.get('/camps_open').then(function(res) {
            $scope.camps = res.data.camps;
        });
    }

    $scope.joinRequest = function() {
        camp_id = document.querySelector('#join_camp_request_camp_id option:checked').value
        camp_name_en = document.querySelector('#join_camp_request_camp_id option:checked').text

        if (camp_id !== undefined) {
            $http.get('/camps/' + camp_id + '/join').then(function(res) {
                fetchSuccess(res.data)
            });
        } else {
            sweetAlert("Oops...", "Choose a camp, yeah?", "error");
        }

        function fetchSuccess(res) {
            // Save details copy for the request
            var user = res.data.user
            var camp = res.data.camp
            camp.name_en = camp_name_en

            var request_data = {
                user: user,
                camp: camp
            }

            // Dialog with user & camp details
            var details_template = 'Camp name: <span class="badge">' + camp_name_en + '</span><br/>Your name: <span class="badge">' + user.full_name + '</span><br/><br/><strong>Make sure they are currect before sending the request. if they arn\'t, please go to you\'r profile and edit.</strong>';
            var modal = $('#join_camp_request_modal')
            modal.find('.user_details').html(details_template);
            modal.modal('show');

            // Send request click listener after user is approve the details
            // Action delayed with 4 second allow user to cancel the request
            $('#join_camp_send_request_btn').click(function() {
                var _sendRequestBtn = $(this);

                $('#join_camp_close_btn').text('Cancel').click(function(e) {
                    e.preventDefault();
                    clearTimeout(_srt);
                    $(this).text('Close');
                    _sendRequestBtn.removeClass('Btn__is-loading').text('Send Request');
                });
                _sendRequestBtn.addClass('Btn__is-loading').text('Sending');

                function _sendRequest() {
                    $.ajax({
                        url: '/camps/' + request_data.camp.id + '/join/deliver',
                        type: 'POST',
                        data: request_data,
                        success: function() {
                            $('#join_camp_request_modal > div').html('<h4>Your request have sent, check request status.</h4>');
                            setTimeout(function() {
                                $('#join_camp_request_modal').modal('hide');
                            }, 4000);
                            window.location.reload();
                        },
                        error: function(jqXHR, exception) {
                            if (jqXHR.status === 500) {
                                sweetAlert('Opps!', 'Couldn\'t send your request due to server problem. \n\nTry again later, thanks.', 'error')
                            }
                        }
                    });
                }
                var _srt = setTimeout(function() {
                    _sendRequest();
                }, 4000);
            });
        }
    }
    
    _getOpenCamps()
});

/**
 * Component: user camp-join pending request details and cancel
 */
app.controller("joinPendingController", function($scope, $http) {
    var user_id = document.querySelector('#pending_request_user_id').value;
    
    $http.get('/users/' + user_id + '/join_details').then(function(res) {
      $scope.camp = res.data.details;
    });
    
    $scope.cancelRequest = function () {
      $http.get('/users/' + user_id + '/join_cancel').then(function(res) {
        window.location.reload()
      });
    }
});