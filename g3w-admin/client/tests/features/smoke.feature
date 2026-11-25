@browser @smoke
Feature: Development server with local static files
  Scenario: Open the expression map with local static files
    Given matching local static files are used for the development server
    When the development expression map is opened
    Then the application and its plugins finish loading
    And the editing plugin is available
    And no JavaScript errors are reported after navigation
