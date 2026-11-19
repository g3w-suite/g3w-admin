@browser
Feature: Time series JavaScript plugin
  Temporal project layers are registered and their time windows can be explored.

  Scenario: Register only temporal layers with default options
    Given the project layers are
      """
      [
        {"id": "plain"},
        {"id": "disabled", "qtimeseries": false},
        {"id": "empty", "qtimeseries": null},
        {"id": "rain", "qtimeseries": {
          "start_date": "2024-01-01T00:00:00",
          "end_date": "2024-01-11T00:00:00", "field": "observed"
        }}
      ]
      """
    When the time series plugin starts
    Then the registered temporal layer is "rain" with unit "days" and multiplier 1
    And its step is 1 and its field is "observed"
    And its date range has 9 intervals
    And the time series sidebar is available
    And plugin loading has finished

  Scenario Outline: Convert QGIS temporal units
    Given a temporal layer with unit "<qgis>" and step 2
    When the time series plugin starts
    Then the registered temporal layer is "rain" with unit "<moment>" and multiplier <multiplier>
    And its step is 2 and its field is "observed"

    Examples:
      | qgis | moment       | multiplier |
      | c    | years        | 100        |
      | dec  | years        | 10         |
      | y    | years        | 1          |
      | mon  | months       | 1          |
      | wk   | days         | 7          |
      | d    | days         | 1          |
      | h    | hours        | 1          |
      | min  | minutes      | 1          |
      | s    | seconds      | 1          |
      | ms   | milliseconds | 1          |

  Scenario: Do not create a sidebar for an unrelated project
    Given a temporal layer with unit "d" and step 1
    And the plugin is disabled for this project
    When the time series plugin starts
    Then the time series sidebar is unavailable
    And plugin loading has finished

  Scenario: Do not create a sidebar without temporal layers
    Given the project layers are
      """
      [{"id": "plain"}]
      """
    When the time series plugin starts
    Then the time series sidebar is unavailable

  Scenario: Wait for the host interface before creating the sidebar
    Given a temporal layer with unit "d" and step 1
    And the host interface is not ready
    When the time series plugin starts
    Then the time series sidebar is unavailable
    When the host interface becomes ready
    Then the time series sidebar is available

  Scenario: Open and close the time series panel
    Given a temporal layer with unit "d" and step 1
    When the time series plugin starts
    And I open the time series sidebar
    Then the map time window is "2024-01-01T00:00:00.000Z/2024-01-02T00:00:00.000Z"
    When I close the time series panel
    Then the sidebar is closed and the map time filter is removed

  Scenario: Move forward and backward through time
    Given a temporal layer with unit "d" and step 2
    When the time series plugin starts
    And I open the time series sidebar
    And I move one step forward
    Then the map time window is "2024-01-03T00:00:00.000Z/2024-01-05T00:00:00.000Z"
    When I move one step backward
    Then the map time window is "2024-01-01T00:00:00.000Z/2024-01-03T00:00:00.000Z"

  Scenario: Clip the time window at the end of the layer range
    Given a temporal layer with unit "d" and step 3
    When the time series plugin starts
    And I open the time series sidebar
    And I move the time slider to 9
    Then the map time window is "2024-01-10T00:00:00.000Z/2024-01-11T00:00:00.000Z"

  Scenario: Play and pause time series animation
    Given a temporal layer with unit "d" and step 1
    When the time series plugin starts
    And I open the time series sidebar
    And I play the animation for one second
    Then the map time window is "2024-01-02T00:00:00.000Z/2024-01-03T00:00:00.000Z"
    When I pause the animation
    Then the time window stays unchanged for two seconds
