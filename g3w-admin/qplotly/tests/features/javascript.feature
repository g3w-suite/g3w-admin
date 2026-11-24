@browser
Feature: Relation charts
  Scenario: Open a chart in the requested relation and clean up after a mount error
    Then chart actions use their own hosts and recover from failed mounting

  Scenario: Dispose a chart while it is mounting
    Then clearing an action waits for the chart to finish mounting

  Scenario: Dispose a chart whose pending mount fails
    Then a failed pending mount still releases the chart host

  Scenario: Release charts opened from multiple related rows
    Then row chart actions release every opened host

  Scenario: Dispose a row chart before its component loads
    Then clearing a row action waits for its pending chart

  Scenario: Draw a relation chart in a narrow panel
    Then the chart retains a usable plot area and can be scrolled
