/*

 Built by
    __                   ____
   / /___  ______  ___  / __/___  ____
  / __/ / / / __ \/ _ \/ /_/ __ \/ __ \
 / /_/ /_/ / /_/ /  __/ __/ /_/ / /_/ /
 \__/\__, / .___/\___/_/  \____/\____/
    /____/_/
 */

var https = require('https');
var extend = require('node.extend');
var builder = require('xmlbuilder');
var parser = require('xml2js');
var soap = require('soap');
var path = require('path');
var util = require('util');

function UPS(args) {
  var $scope = this,
    hosts = {
      sandbox: 'wwwcie.ups.com',
      live: 'onlinetools.ups.com'
    },
    defaults = {
      imperial: true, // for inches/lbs, false for metric cm/kgs
      currency: 'USD',
      environment: 'sandbox',
      access_key: '',
      username: '',
      password: '',
      pretty: false,
      user_agent: 'uh-sem-blee, Co | typefoo',
      debug: false
    },
    dimensional_weight_values = {
      imperial: 139,
      metric: 5000
    },
    pickup_codes = {
      'daily_pickup': '01',
      'customer_counter': '03',
      'one_time_pickup': '06',
      'on_call_air': '07',
      'suggested_retail_rates': '11',
      'letter_center': '19',
      'air_service_center': '20'
    },
    customer_classifications = {
      'wholesale': '01',
      'occasional': '03',
      'retail': '04'
    },
    tax_id_types = {
      'EIN': 'EIN',
      'DNS': 'DNS',
      'FGN': 'FGN'
    },
    default_services = {
      '01': 'UPS Next Day Air',
      '02': 'UPS Second Day Air',
      '03': 'UPS Ground',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard',
      '12': 'UPS Three-Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early A.M.',
      '54': 'UPS Worldwide Express Plus',
      '59': 'UPS Second Day Air A.M.',
      '65': 'UPS Saver',
      '82': 'UPS Today Standard',
      '83': 'UPS Today Dedicated Courier',
      '84': 'UPS Today Intercity',
      '85': 'UPS Today Express',
      '86': 'UPS Today Express Saver',
      '92': 'UPS SurePost (USPS) < 1lb',
      '93': 'UPS SurePost (USPS) > 1lb',
      '94': 'UPS SurePost (USPS) BPM',
      '95': 'UPS SurePost (USPS) Media'
    },
    return_services = {
      '3': 'UPS Return Service 1 Attempt',
      '5': 'UPS Return Service 3 Attempt',
      '8': 'UPS Electronic Return Label',
      '9': 'UPS Print Return Label',
      '10': 'UPS Exchange Print Return Label',
      '11': 'UPS Pack  & Collect Service 1-Attempt Box 1',
      '12': 'UPS Pack & Collect Service 1-Attempt Box 2',
      '13': 'UPS Pack & Collect Service 1-Attempt Box 3',
      '14': 'UPS Pack & Collect Service 1-Attempt Box 4',
      '15': 'UPS Pack & Collect Service 1-Attempt Box 5',
      '16': 'UPS Pack & Collect Service 3-Attempt Box 1',
      '17': 'UPS Pack & Collect Service 3-Attempt Box 2',
      '18': 'UPS Pack & Collect Service 3-Attempt Box 3',
      '19': 'UPS Pack & Collect Service 3-Attempt Box 4',
      '20': 'UPS Pack & Collect Service 3-Attempt Box 5'
    },
    pickup_services = {
      '001': 'UPS Next Day Air',
      '002': 'UPS Second Day Air',
      '003': 'UPS Ground',
      '007': 'UPS Worldwide Express',
      '008': 'UPS Worldwide Expedited',
      '011': 'UPS Standard',
      '012': 'UPS Three-Day Select',
      '013': 'UPS Next Day Air Saver',
      '014': 'UPS Next Day Air Early A.M.',
      '054': 'UPS Worldwide Express Plus',
      '059': 'UPS Second Day Air A.M.',
      '065': 'UPS Saver',
      '082': 'UPS Today Standard',
      '083': 'UPS Today Dedicated Courier',
      '084': 'UPS Today Intercity',
      '085': 'UPS Today Express',
      '086': 'UPS Today Express Saver',
      '092': 'UPS SurePost (USPS) < 1lb',
      '093': 'UPS SurePost (USPS) > 1lb',
      '094': 'UPS SurePost (USPS) BPM',
      '095': 'UPS SurePost (USPS) Media'
    },
    pickup_payment_methods = {
      '00': 'No payment needed',
      '01': 'Pay by shipper account',
      '03': 'Pay by charge card',
      '04': 'Pay by tracking number',
      '05': 'Pay by check or money order'
    },
    canada_origin_services = {
      '01': 'UPS Express',
      '08': 'UPS Expedited',
      '11': 'UPS Standard',
      '12': 'UPS Three-Day Select',
      '13': 'UPS Saver SM', // Should be 65 when doing Ship calls
      '14': 'UPS Express Early A.M.',
      '07': 'UPS Exress to USA' // Should be 01 when doing Ship calls
    },
    mexico_origin_services = {
      '07': 'UPS Express',
      '08': 'UPS Expedited',
      '54': 'UPS Express Plus'
    },
    eu_origin_services = {
      '07': 'UPS Express',
      '08': 'UPS Expedited'
    },
    other_non_us_origin_services = {
      '07': 'UPS Express'
    },
    tracking_status_codes = {
      'I': 'In Transit',
      'D': 'Delivered',
      'X': 'Exception',
      'P': 'Pickup',
      'M': 'Manifest Pickup'
    },
    freight_billing_options = $scope.freight_billing_options = {
      '10': 'Prepaid',
      '30': 'Bill to Third Party',
      '40': 'Freight Collect'
    },
    freight_service_classes = $scope.freight_service_classes = {
      50: {min: 50, max: 10000},
      55: {min: 35, max: 50},
      60: {min: 30, max: 35},
      65: {min: 22.5, max: 30},
      70: {min: 15, max: 22.5},
      77.5: {min: 13.5, max: 15},
      85: {min: 12, max: 13.5},
      92.5: {min: 10.5, max: 12},
      100: {min: 9, max: 10.5},
      110: {min: 8, max: 9},
      125: {min: 7, max: 8},
      150: {min: 6, max: 7},
      175: {min: 5, max: 6},
      200: {min: 4, max: 5},
      250: {min: 3, max: 4},
      300: {min: 2, max: 3},
      400: {min: 1, max: 2},
      500: {min: 0, max: 1}
    },
    freight_service_codes = $scope.freight_service_codes = {
      '308': 'UPS Freight LTL',
      '309': 'UPS Freight LTL - Guaranteed',
      '334': 'UPS Freight LTL - Guaranteed AM'
    },
    freight_handling_codes = $scope.freight_handling_codes = {
      'SDK': 'SKID',
      'CBY': 'CARBOY',
      'PLT': 'PALLET',
      'TOT': 'TOTES',
      'LOO': 'LOOSE',
      'OTH': 'OTHER'
    },
    freight_package_codes = $scope.freight_package_codes = {
      'BAG': 'Bag',
      'BAL': 'Bale',
      'BAR': 'Barrel',
      'BDL': 'Bundle',
      'BIN': 'Bin',
      'BOX': 'Box',
      'BSK': 'Basket',
      'BUN': 'Bunch',
      'CAB': 'Cabinet',
      'CAN': 'Can',
      'CAR': 'Carrier',
      'CAS': 'Case',
      'CBY': 'Carboy',
      'CON': 'Container',
      'CRT': 'Crate',
      'CSK': 'Cask',
      'CTN': 'Carton',
      'CYL': 'Cylinder',
      'DRM': 'Drum',
      'LOO': 'Loose',
      'OTH': 'Other',
      'PAL': 'Pail',
      'PCS': 'Pieces',
      'PKG': 'Package',
      'PLN': 'Pipe Line',
      'PLT': 'Pallet',
      'RCK': 'Rack',
      'REL': 'Reel',
      'ROL': 'Roll',
      'SKD': 'Skid',
      'SPL': 'Spool',
      'TBE': 'Tube',
      'TNK': 'Tank',
      'UNT': 'Unit',
      'VPK': 'Van Pack',
      'WRP': 'Wrapped'
    },
    pickup_package_types = $scope.pickup_package_types = {
      '01': 'Package',
      '02': 'UPS Letter',
      '03': 'Pallet'
    },
    eu_country_codes = ['GB', 'AT', 'BE', 'BG', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
    us_territories_treated_as_countries = ['AS', 'FM', 'GU', 'MH', 'MP', 'PW', 'PR', 'VI'];

  $scope.options = defaults;
  $scope.service_codes = default_services;
  $scope.tracking_codes = tracking_status_codes;

  function buildAddress(data) {
    var address = {
      'AddressLine1': data.address_line_1 || '',
      'AddressLine2': data.address_line_2 || '',
      'AddressLine3': data.address_line_3 || '',
      'City': data.city || '',
      'StateProvinceCode': data.state_code || '',
      'PostalCode': data.postal_code || '',
      'CountryCode': data.country_code || ''
    };

    if(data.residential) {
      address.ResidentialAddressIndicator = true;
    }

    return address;
  }

  function buildShipment(data, options) {
    data.shipper = data.shipper || {address: {}};
    data.ship_to = data.ship_to || {address: {}};
    data.packages = data.packages || [{}];
    data.currency = data.currency || $scope.options.currency;

    var shipment = {
      'Shipper': {
        'Name': data.shipper.name || (data.shipper.company_name || ''),
        'AttentionName': data.shipper.attention_name || '',
        'PhoneNumber': data.shipper.phone_number || '',
        'EMailAddress': data.shipper.email_address || '',
        'FaxNumber': data.shipper.fax_number || '',
        'ShipperNumber': data.shipper.shipper_number || '',
        'Address': buildAddress(data.shipper.address)
      },
      'ShipTo': {
        'CompanyName': data.ship_to.name || (data.ship_to.company_name || ''),
        'AttentionName': data.ship_to.attention_name || (data.ship_to.company_name || ''),
        'PhoneNumber': data.ship_to.phone_number || '',
        'FaxNumber': data.ship_to.fax_number || '',
        'EMailAddress': data.ship_to.email_address || '',
        'Address': buildAddress(data.ship_to.address)
      },
      'Description': data.shipment_description || ''
    };

    if(data.shipper.tax_identification_number) {
      shipment.Shipper.TaxIdentificationNumber = data.shipper.tax_identification_number;
    }

    if(data.ship_to.location_id) {
      shipment.ShipTo.TaxIdentificationNumber = data.ship_to.tax_identification_number;
    }

    if(data.ship_to.tax_identification_number) {
      shipment.ShipTo.TaxIdentificationNumber = data.ship_to.tax_identification_number;
    }

    if(data.ship_from) {
      shipment.ShipFrom = {
        'CompanyName': data.ship_from.company_name || '',
        'PhoneNumber': data.ship_from.phone_number || '',
        'Address': buildAddress(data.ship_from.address)
      };

      if(data.ship_from.attention_name) {
        shipment.ShipFrom.AttentionName = data.ship_from.attention_name;
      }

      if(data.ship_from.tax_identification_number) {
        shipment.ShipFrom.TaxIdentificationNumber = data.ship_from.tax_identification_number;
      }

      if(data.ship_from.tax_id_type && tax_id_types[data.ship_from.tax_id_type]) {
        shipment.ShipFrom.TaxIDType = { Code: data.ship_from.tax_id_type, Description: tax_id_types[data.ship_from.tax_id_type] };
      }
    }

    if(data.sold_to) {
      shipment.SoldTo = {
        'CompanyName': data.sold_to.company_name || '',
        'PhoneNumber': data.sold_to.phone_number || '',
        'Address': buildAddress(data.sold_to.address)
      };

      if(data.sold_to.option) {
        shipment.SoldTo.Option = data.sold_to.option;
      }

      if(data.sold_to.attention_name) {
        shipment.SoldTo.AttentionName = data.sold_to.attention_name;
      }

      if(data.sold_to.tax_identification_number) {
        shipment.SoldTo.TaxIdentificationNumber = data.sold_to.tax_identification_number;
      }
    }

    if(data.ship_to.address.state_code || options.negotiated_rates) {
      shipment.RateInformation = ["NegotiatedRatesIndicator"];
    }

    if(data.saturday_delivery) {
      if(!shipment.ShipmentServiceOptions || !(shipment.ShipmentServiceOptions instanceof Array)) {
        shipment.ShipmentServiceOptions = [];
      }
      shipment.ShipmentServiceOptions['SaturdayDelivery'] = true;
    }
    if(data.ShipmentServiceOptions){
        shipment.ShipmentServiceOptions = data.ShipmentServiceOptions
    }

    shipment['#list'] = [];

    if(data.service && default_services[data.service]) {
      shipment['Service'] = {
        'Code': data.service
      };
    }

    if(data.return_service && return_services[data.return_service]) {
      shipment['ReturnService'] = {
        'Code': data.return_service
      };
    }

    for(var i = 0; i < data.packages.length; i++) {
      var p = { 'Package': {
        'PackagingType': {
          'Code': data.packages[i].packaging_type || '00'
        },
        'PackageWeight': {
          'Weight': data.packages[i].weight || '',
          'UnitOfMeasurement': {
            'Code': options.use_ounces ? 'OZS' : ($scope.options.imperial ? 'LBS' : 'KGS')
          }
        }
      }};

      if(data.packages[i].description) {
        p['Package']['Description'] = data.packages[i].description;
      }

      if(data.packages[i].dimensions) {
        p['Package']['Dimensions'] = {
          'Length': data.packages[i].dimensions.length || '1',
          'Width': data.packages[i].dimensions.width || '1',
          'Height': data.packages[i].dimensions.height || '1',
          'UnitOfMeasurement': {
            'Code': $scope.options.imperial ? 'IN' : 'CM'
          }
        };
      }

      if(data.packages[i].insured_value) {
        if(!p['Package']['PackageServiceOptions']) {
          p['Package']['PackageServiceOptions'] = {};
        }
        p['Package']['PackageServiceOptions']['InsuredValue'] = {
          'CurrencyCode': data.currency,
          'MonetaryValue': data.packages[i].insured_value || '1'
        };
      }

      if(data.packages[i].delivery_confirmation_type) {
        if(!p['Package']['PackageServiceOptions']) {
          p['Package']['PackageServiceOptions'] = {};
        }
        p['Package']['PackageServiceOptions']['DeliveryConfirmation'] = {
          'DCISType': data.packages[i].delivery_confirmation_type || '2'
        };
      }

      if(data.packages[i].reference_number && typeof data.packages[i].reference_number === 'string') {
        p['Package']['ReferenceNumber'] = {
          'Value': data.packages[i].reference_number
        };
      } else if(data.packages[i].reference_number && typeof data.packages[i].reference_number === 'object' && !(data.packages[i].reference_number instanceof Array)) {
        // Code/Value keypair
        p['Package']['ReferenceNumber'] = {
          'Code': data.packages[i].reference_number.code,
          'Value': data.packages[i].reference_number.value,
          'BarCodeIndicator': data.packages[i].reference_number.bar_code_indicator
        };
      } else if(data.packages[i].reference_number && data.packages[i].reference_number instanceof Array) {
        // Array of ReferenceNumbers
        p['Package']['#list'] = [];
        for(var j = 0; j < data.packages[i].reference_number.length; j++) {
          var r = data.packages[i].reference_number[j];
          var ref;
          if(typeof r === 'string') {
            ref = {
              'ReferenceNumber': {
                'Value': r
              }
            };
          } else if(typeof r === 'object') {
            ref = {
              'ReferenceNumber': {
                'Code': r.code,
                'Value': r.value,
                'BarCodeIndicator': r.bar_code_indicator
              }
            };
          }
          p['Package']['#list'].push(ref);
        }
      }

      shipment['#list'].push(p);
    };

    return shipment;
  }

  function buildPaymentInformation(data, options) {
    data.shipper = data.shipper || {address: {}};
    var payment = {
      'Prepaid': {
        'BillShipper': {
          'AccountNumber': data.shipper.shipper_number || ''
        }
      }
    };

    return payment;
  }

  function buildLabelSpecification(data, options) {
    var label,
        label_type = data.label_type || 'GIF';
    switch(label_type) {
    case 'EPL':
      label = {
        'LabelPrintMethod': {
          'Code': 'EPL',
          'Description': 'epl2 file'
        },
        'LabelStockSize': {
          'Height': '4',
          'Width': '6',
        }
      };
      break;
    case 'GIF':
      label = {
        'LabelPrintMethod': {
          'Code': 'GIF'
        },
        'HTTPUserAgent': $scope.options.user_agent,
        'LabelImageFormat': {
          'Code': 'GIF'
        }
      };
      break;
    case 'ZPL':
      label = {
        'LabelPrintMethod': {
          'Code': 'ZPL',
          'Description': 'zpl2 file'
        },
        'LabelStockSize': {
          'Height': '4',
          'Width': '6',
        }
      };
      break;
    // Also supported by the UPS API but not supported here: SPL, STARPL
    default:
      throw new Error("unsupported label type " + label_type);
    }

    return label;
  }

  $scope.config = function(args) {
    $scope.options = extend(defaults, args);
    return $scope;
  };

  $scope.dimensionalWeight = function(weight, length, width, height) {
    var dimWeight = (length * width * height) / ($scope.options.imperial ? dimensional_weight_values.imperial : dimensional_weight_values.metric);
    if(dimWeight > weight) {
      return parseInt(dimWeight, 10);
    } else {
      return weight;
    }
  };

  $scope.density = function(weight, length, width, height) {
    return (weight / ((length * width * height) / 1728));
  };

  $scope.buildAccessRequest = function(data, options) {
    var root = builder.create('AccessRequest', {headless: true});
    root.att('xml:lang', 'en-US');
    root.ele('UserId', $scope.options.username);
    root.ele('Password', $scope.options.password);
    root.ele('AccessLicenseNumber', $scope.options.access_key);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.buildRatesRequest = function(data, options) {
    if(!data) {
      data = {};
    }
    if(!options) {
      options = {};
    }
    data.pickup_type = data.pickup_type || 'daily_pickup';
    var root = builder.create('RatingServiceSelectionRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'Rate',
        'RequestOption': (data.service && data.service.length > 0) ? 'Rate' : 'Shop',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'PickupType': {
        'Code': data.pickup_type_code || pickup_codes[data.pickup_type]
      },
      'CustomerClassification': {
        'Code': data.customer_classification || '00'
      }
    };

    request['Shipment'] = buildShipment(data, options);

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleRatesResponse = function(json, callback) {
    if(json instanceof Array) {
      if(json.length === 0) {
        return callback(new Error('No return'), null);
      }
      var ret = {
        Response: null,
        RatedShipment: []
      };
      var err = null;
      for(var i = 0; i < json.length; i++) {
        var j = json[i];
        if(j.RatingServiceSelectionResponse.Response.ResponseStatusCode !== '1') {
          err = j;
          continue;
        }
        if(ret.Response === null) {
          ret.Response = j.RatingServiceSelectionResponse.Response;
        }
        ret.RatedShipment.push(j.RatingServiceSelectionResponse.RatedShipment);
      }

      if(ret.Response === null) {
        return callback(err, null);
      }
      return callback(err, ret);
    } else {
      if(json.RatingServiceSelectionResponse.Response.ResponseStatusCode !== '1') {
        return callback(json.RatingServiceSelectionResponse.Response.Error, null);
      }
      callback(null, json.RatingServiceSelectionResponse);
    }
  };

  $scope.buildTrackingRequest = function(tracking_number, options) {
    if(!options) {
      options = {};
    }
    var root = builder.create('TrackRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'Track',
        'RequestOption': options.latest === true ? '0' : '1',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      }
    };

    request['TrackingNumber'] = tracking_number;
    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleTrackingResponse = function(json, callback) {
    if(json.TrackResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.TrackResponse.Response.Error, null);
    }
    return callback(null, json.TrackResponse);
  };

  $scope.buildShipmentConfirmRequest = function(data, options) {
    if(!data) {
      data = {};
    }
    if(!options) {
      options = {};
    }
    data.pickup_type = data.pickup_type || 'daily_pickup';
    var root = builder.create('ShipmentConfirmRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'ShipConfirm',
        'RequestOption': 'nonvalidate',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'PickupType': {
        'Code': data.pickup_type_code || pickup_codes[data.pickup_type]
      },
      'CustomerClassification': {
        'Code': data.customer_classification || '00'
      },
      'LabelSpecification': buildLabelSpecification(data, options)
    };

    request['Shipment'] = buildShipment(data, options);
    request['Shipment']['Service'] = {
      'Code': data.service_code || '03',
      'Description': default_services[data.service_code] || default_services['03']
    };
    request['Shipment']['PaymentInformation'] = buildPaymentInformation(data, options);

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleShipmentConfirmResponse = function(json, callback) {
    if(json.ShipmentConfirmResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.ShipmentConfirmResponse.Response.Error, null);
    }
    return callback(null, json.ShipmentConfirmResponse);
  };

  $scope.buildShipmentAcceptRequest = function(shipment_digest, options) {
    if(!options) {
      options = {};
    }
    var root = builder.create('ShipmentAcceptRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'ShipAccept',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'ShipmentDigest': shipment_digest
    };

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleShipmentAcceptResponse = function(json, callback) {
    if(json.ShipmentAcceptResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.ShipmentAcceptResponse.Response.Error, null);
    }
    return callback(null, json.ShipmentAcceptResponse);
  };

  $scope.buildVoidShipmentRequest = function(data, options) {
    if(!options) {
      options = {};
    }
    var root = builder.create('VoidShipmentRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': '1',
        'RequestOption': '1',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'ExpandedVoidShipment': {}
    };

    if(typeof data === 'string') {
      request['ExpandedVoidShipment']['ShipmentIdentificationNumber'] = data;
    } else {

      if(data.shipment_identification_number) {
        request['ExpandedVoidShipment']['ShipmentIdentificationNumber'] =  data.shipment_identification_number;
      }

      if(data.tracking_number) {
        request['ExpandedVoidShipment']['TrackingNumber'] = data.tracking_number;
      }

      if(data.tracking_numbers) {
        request['ExpandedVoidShipment']['#list'] = [];
        for(var i = 0; i < data.tracking_numbers.length; i++) {
          request['ExpandedVoidShipment']['#list'].push({
            TrackingNumber: data.tracking_numbers[i]
          });
        }
      }
    }

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    var r = root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleVoidShipmentResponse = function(json, callback) {
    if(json.VoidShipmentResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.VoidShipmentResponse.Response.Error, null);
    }
    return callback(null, json.VoidShipmentResponse);
  };

  $scope.buildAddressValidationRequest = function(data, options) {
    if(!options) {
      options = {};
    }
    var root = builder.create('AddressValidationRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'XAV',
        'RequestOption': data.request_option || '3',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'MaximumListSize': data.maximum_list_size || '3',
      'AddressKeyFormat': {
        'ConsigneeName': data.company || (data.name || ''),
        'BuildingName': data.company || '',
        '#list': [
          {'AddressLine': data.address_line_1 || ''},
          {'AddressLine': data.address_line_2 || ''},
          {'AddressLine': data.address_line_3 || ''}
        ],
        'PoliticalDivision2': data.city || '',
        'PoliticalDivision1': data.state_code || '',
        'PostcodePrimaryLow': data.postal_code || '',
        'CountryCode': data.country_code || ''
      }
    };

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleAddressValidationResponse = function(json, callback) {
    if(json.AddressValidationResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.AddressValidationResponse.Response.Error, null);
    }
    return callback(null, json.AddressValidationResponse);
  };

  $scope.buildTimeInTransitRequest = function(data, options) {
    if(!options) {
      options = {};
    }
    data.from = data.from || {};
    data.to = data.to || {};
    data.currency = data.currency || $scope.options.currency;
    var date = new Date();
    date = new Date(date.setDate(date.getDate()+1));
    var tomorrow = date.getFullYear()
                   + (date.getMonth()+1 < 10 ? '0' + (date.getMonth()+1) : date.getMonth()+1)
                   + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate());
    var root = builder.create('TimeInTransitRequest', {headless: true});
    var request = {
      'Request': {
        'RequestAction': 'TimeInTransit',
        'TransactionReference': {
          'CustomerContext': options.transaction_id || ''
        }
      },
      'ShipmentWeight': {
        'UnitOfMeasurement': {
          'Code': $scope.options.imperial ? 'LBS' : 'KGS'
        },
        'Weight': data.weight || '1'
      },
      'TransitFrom': {
        'AddressArtifactFormat': {
          'PoliticalDivision2': data.from.city || '',
          'PoliticalDivision1': data.from.state_code || '',
          'PostcodePrimaryLow': data.from.postal_code || '',
          'CountryCode': data.from.country_code || ''
        }
      },
      'TransitTo': {
        'AddressArtifactFormat': {
          'PoliticalDivision2': data.to.city || '',
          'PoliticalDivision1': data.to.state_code || '',
          'PostcodePrimaryLow': data.to.postal_code || '',
          'CountryCode': data.to.country_code || ''
        }
      },
      'PickupDate': data.pickup_date || tomorrow
    };

    if(data.total_packages) {
      request.TotalPackagesInShipment = data.total_packages;
    }

    if(data.value) {
      request.InvoiceLineTotal = {
        'MonetaryValue': data.value,
        'CurrencyCode': data.currency
      };
    }

    if(options && options.extra_params && typeof options.extra_params === 'object') {
      request = extend(true, request, options.extra_params);
    }

    root.ele(request);
    return root.end({pretty: $scope.options.pretty});
  };

  $scope.handleTimeInTransitResponse = function(json, callback) {
    if(json.TimeInTransitResponse.Response.ResponseStatusCode !== '1') {
      return callback(json.TimeInTransitResponse.Response.Error, null);
    }
    return callback(null, json.TimeInTransitResponse);
  };

  $scope.buildPickupRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'pickup', 'Pickup.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        RatePickupIndicator: data.rate_pickup_indicator,
        Shipper: {
          Account: {
            AccountNumber: data.shipper_account,
            AccountCountryCode: data.shipper_account_country_code || 'US'
          }
        },
        PickupDateInfo: {
          PickupDate: data.pickup_date,
          ReadyTime: data.eariest_time_ready,
          CloseTime: data.latest_time_ready
        },
        PickupAddress: {
          CompanyName: data.pickup_address.company_name,
          ContactName: data.pickup_address.contact_name,
          AddressLine: data.pickup_address.address_line_1,
          Room: data.pickup_address.room,
          Floor: data.pickup_address.floor,
          City: data.pickup_address.city,
          StateProvince: data.pickup_address.state_code,
          Urbanizaiton: data.pickup_address.urbanization,
          PostalCode: data.pickup_address.postal_code,
          CountryCode: data.pickup_address.country_code,
          ResidentialIndicator: data.pickup_address.residential ? 'Y' : 'N',
          PickupPoint: data.pickup_address.pickup_point,
          Phone: data.pickup_address.phone_number ? {
            Number: data.pickup_address.phone_number,
            Extension: data.pickup_address.phone_number_extension
          } : undefined
        },
        AlternateAddressIndicator: data.alternate_address_indicator || 'N',
        TotalWeight: {
          Weight: data.weight,
          UnitOfMeasurement: $scope.options.imperial ? 'LBS' : 'KGS'
        },
        OverweightIndicator: data.overweight ? 'Y' : 'N',
        PaymentMethod: data.payment_method,
        SpecialInstruction: data.special_instruction,
        ReferenceNumber: data.reference_number,
        Nofification: {
          ConfirmationEmailAddress: data.confirmation_email_address,
          UndeliverableEmailAddress: data.undeliverable_email_address
        }
      };

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      params.PickupPiece = [];
      for(var i = 0; i < data.pickup_piece.length; i++) {
        params.PickupPiece.push({
          ServiceCode: data.pickup_piece[i].service_code,
          Quantity: data.pickup_piece[i].quantity,
          DestinationCountryCode: data.pickup_piece[i].destination_country_code || 'US',
          ContainerCode: data.pickup_piece[i].container_code
        });
      }

      client.ProcessPickupCreation(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });
  };

  $scope.handlePickupResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  $scope.buildPickupRateRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'pickup', 'Pickup.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        ShipFrom: {
          Name: data.ship_from.name,
          Address: {
            AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
            City: data.ship_from.address.city,
            StateProvinceCode: data.ship_from.address.state_code,
            PostalCode: data.ship_from.address.postal_code,
            CountryCode: data.ship_from.address.country_code
          }
        },
        ShipTo: {
          Name: data.ship_to.name,
          Address: {
            AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
            City: data.ship_to.address.city,
            StateProvinceCode: data.ship_to.address.state_code,
            PostalCode: data.ship_to.address.postal_code,
            CountryCode: data.ship_to.address.country_code
          }
        }
      };

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      client.ProcessPickupRate(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });
  };

  $scope.handlePickupRateResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  $scope.buildCancelPickupRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'freight_pickup', 'FreightPickup.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        ShipFrom: {
          Name: data.ship_from.name,
          Address: {
            AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
            City: data.ship_from.address.city,
            StateProvinceCode: data.ship_from.address.state_code,
            PostalCode: data.ship_from.address.postal_code,
            CountryCode: data.ship_from.address.country_code
          }
        },
        ShipTo: {
          Name: data.ship_to.name,
          Address: {
            AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
            City: data.ship_to.address.city,
            StateProvinceCode: data.ship_to.address.state_code,
            PostalCode: data.ship_to.address.postal_code,
            CountryCode: data.ship_to.address.country_code
          }
        }
      };

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      client.ProcessPickupRate(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });
  };

  $scope.handleCancelPickupResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  $scope.buildFreightRateRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'freight_rate', 'FreightRate.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        ShipFrom: {
          Name: data.ship_from.name,
          Address: {
            AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
            City: data.ship_from.address.city,
            StateProvinceCode: data.ship_from.address.state_code,
            PostalCode: data.ship_from.address.postal_code,
            CountryCode: data.ship_from.address.country_code
          }
        },
        ShipTo: {
          Name: data.ship_to.name,
          Address: {
            AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
            City: data.ship_to.address.city,
            StateProvinceCode: data.ship_to.address.state_code,
            PostalCode: data.ship_to.address.postal_code,
            CountryCode: data.ship_to.address.country_code
          }
        },
        PaymentInformation: {
          Payer: {
            Name: data.payer.name,
            Address: {
              AddressLine: [data.payer.address.address_line_1, data.payer.address.address_line_2, data.payer.address.address_line_3],
              City: data.payer.address.city,
              StateProvinceCode: data.payer.address.state_code,
              PostalCode: data.payer.address.postal_code,
              CountryCode: data.payer.address.country_code
            },
            ShipperNumber: data.payer.shipper_number
          },
          ShipmentBillingOption: {
            Code: data.billing_option
          }
        },
        Service: {
          Code: data.service_code
        }
      };

      if(data.handling_unit_one) {
        params.HandlingUnitOne = {
          Quantity: data.handling_unit_one.quantity,
          Type: {
            Code: data.handling_unit_one.code
          }
        }
      }

      if(data.commodity instanceof Array) {
        params.Commodity = [];
        for(var i = 0; i < data.commodity.length; i++) {
          var d = {
            Description: data.commodity[i].description,
            Weight: {
              Value: data.commodity[i].weight,
              UnitOfMeasurement: {
                Code: $scope.options.imperial ? 'LBS' : 'KGS'
              }
            },
            NumberOfPieces: data.commodity[i].number_of_pieces,
            PackagingType: {
              Code: data.commodity[i].packaging_type
            }
          };

          if(data.commodity[i].dimensions) {
            d.Dimensions = {
              UnitOfMeasurement: {
                Code: $scope.options.imperial ? 'IN' : 'CM'
              },
              Length: data.commodity[i].dimensions.length,
              Width: data.commodity[i].dimensions.width,
              Height: data.commodity[i].dimensions.height
            };
          }

          if(data.commodity[i].dangerous_goods_indicator) {
            d.DangerousGoodsIndicator = data.commodity[i].dangerous_goods_indicator;
          }

          if(data.commodity[i].commodity_value) {
            d.CommodityValue = {
              CurrencyCode: data.commodity[i].commodity_value.currency_code,
              MonetaryValue: data.commodity[i].commodity_value.monetary_value,
            }
          }

          if(data.commodity[i].freight_class) {
            d.FreightClass = data.commodity[i].freight_class;
          }

          if(data.commodity[i].nmfc_commodity_code) {
            d.NMFCCommodityCode = data.commodity[i].nmfc_commodity_code;
          }

          if(data.commodity[i].nmfc_prime_code) {
            d.NMFCCommodity = {
              PrimeCode: data.commodity.nmfc_prime_code,
              SubCode: data.commodity.nmfc_sub_code
            };
          }

          params.Commodity.push(d);
        }
      } else {
        params.Commodity = {
          Description: data.commodity.description,
          Weight: {
            Value: data.commodity.weight,
            UnitOfMeasurement: {
              Code: $scope.options.imperial ? 'LBS' : 'KGS'
            }
          },
          NumberOfPieces: data.commodity.number_of_pieces,
          PackagingType: {
            Code: data.commodity.packaging_type
          }
        };

        if(data.commodity.dimensions) {
          params.Commodity.Dimensions = {
            UnitOfMeasurement: {
              Code: $scope.options.imperial ? 'IN' : 'CM'
            },
            Length: data.commodity.dimensions.length,
            Width: data.commodity.dimensions.width,
            Height: data.commodity.dimensions.height
          }
        }

        if(data.commodity.dangerous_goods_indicator) {
          params.Commodity.DangerousGoodsIndicator = data.commodity.dangerous_goods_indicator;
        }

        if(data.commodity.commodity_value) {
          params.Commodity.CommodityValue = {
            CurrencyCode: data.commodity.commodity_value.currency_code,
            MonetaryValue: data.commodity.commodity_value.monetary_value,
          }
        }
        if(data.commodity.freight_class) {
          params.Commodity.FreightClass = data.commodity.freight_class;
        }

        if(data.commodity.nmfc_commodity_code) {
          params.Commodity.NMFCCommodityCode = data.commodity.nmfc_commodity_code;
        }

        if(data.commodity.nmfc_prime_code) {
          params.Commodity.NMFCCommodity = {
            PrimeCode: data.commodity.nmfc_prime_code,
            SubCode: data.commodity.nmfc_sub_code
          };
        }
      }

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      client.ProcessFreightRate(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });


  };

  $scope.handleFreightRateResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  $scope.buildFreightShipRequest = function(data, options, resource, callback) {
    //soap.createClient(path.join(__dirname,  'wsdl', 'freight_shipping', 'FreightShip.wsdl'), {ignoredNamespaces: {namespaces: ['fsp']}}, function(err, client) {
      //if(err) {
      //  return callback(err, null);
      //}

      //client.setEndpoint('https://' + hosts[$scope.options.environment] + resource.p);

      //client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');

      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context,
            TransactionIdentifier: data.transaction_identifier
          }
        },
        Shipment: {
          ShipFrom: {
            Name: data.ship_from.name,
            Address: {
              //AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
              '#list': [
                {AddressLine: {'#text': data.ship_from.address.address_line_1}},
                {AddressLine: {'#text': data.ship_from.address.address_line_2}},
                {AddressLine: {'#text': data.ship_from.address.address_line_3}},
              ],
              City: data.ship_from.address.city,
              StateProvinceCode: data.ship_from.address.state_code,
              PostalCode: data.ship_from.address.postal_code,
              CountryCode: data.ship_from.address.country_code
            },
            AttentionName: data.ship_from.attention_name,
            Phone: data.ship_from.phone_number ? {
              Number: data.ship_from.phone_number,
              Extension: data.ship_from.phone_number_extension
            } : undefined,
            EMailAddress: data.ship_from.email_address,
            TaxIdentificationNumber: data.ship_from.tax_identification_number
          },
          ShipperNumber: data.shipment_shipper_number,
          ShipTo: {
            Name: data.ship_to.name,
            Address: {
              //AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
              '#list': [
                {AddressLine: {'#text': data.ship_to.address.address_line_1}},
                {AddressLine: {'#text': data.ship_to.address.address_line_2}},
                {AddressLine: {'#text': data.ship_to.address.address_line_3}},
              ],
              City: data.ship_to.address.city,
              StateProvinceCode: data.ship_to.address.state_code,
              PostalCode: data.ship_to.address.postal_code,
              CountryCode: data.ship_to.address.country_code
            },
            AttentionName: data.ship_to.attention_name,
            Phone: data.ship_to.phone_number ? {
              Number: data.ship_to.phone_number,
              Extension: data.ship_to.phone_number_extension
            } : undefined,
            EMailAddress: data.ship_to.email_address,
            TaxIdentificationNumber: data.ship_to.tax_identification_number
          },
          PaymentInformation: {
            Payer: {
              Name: data.payer.name,
              Address: {
                //AddressLine: [data.payer.address.address_line_1, data.payer.address.address_line_2, data.payer.address.address_line_3],
                '#list': [
                  {AddressLine: {'#text': data.payer.address.address_line_1}},
                  {AddressLine: {'#text': data.payer.address.address_line_2}},
                  {AddressLine: {'#text': data.payer.address.address_line_3}},
                ],
                City: data.payer.address.city,
                StateProvinceCode: data.payer.address.state_code,
                PostalCode: data.payer.address.postal_code,
                CountryCode: data.payer.address.country_code
              },
              AttentionName: data.payer.attention_name,
              Phone: data.payer.phone_number ? {
                Number: data.payer.phone_number,
                Extension: data.payer.phone_number_extension
              } : undefined,
              EMailAddress: data.payer.email_address,
              ShipperNumber: data.payer.shipper_number
            },
            ShipmentBillingOption: {
              Code: data.billing_option
            }
          },
          Service: {
            Code: data.service_code
          },
          HandlingInstructions: data.handling_instructions,
          DeliveryInstructions: data.delivery_instructions,
          PickupInstructions: data.pickup_instructions,
          SpecialInstructions: data.special_instructions
        }
      };

      if(data.shipment_account_type) {
        params.Shipment.AccountType = {
          Code: data.shipment_account_type
        };
      }

      if(data.handling_unit_one) {
        params.Shipment.HandlingUnitOne = {
          Quantity: data.handling_unit_one.quantity,
          Type: {
            Code: data.handling_unit_one.code
          }
        }
      }

      if(data.commodity instanceof Array) {
        //params.Shipment.Commodity = [];
        if(!params.Shipment['#list']) {
          params.Shipment['#list'] = [];
        }
        for(var i = 0; i < data.commodity.length; i++) {
          var d = {
            CommodityID: data.commodity[i].id,
            Description: data.commodity[i].description,
            Weight: {
              Value: data.commodity[i].weight,
              UnitOfMeasurement: {
                Code: $scope.options.imperial ? 'LBS' : 'KGS'
              }
            },
            NumberOfPieces: data.commodity[i].number_of_pieces,
            PackagingType: {
              Code: data.commodity[i].packaging_type
            }
          };

          if(data.commodity[i].dimensions) {
            d.Dimensions = {
              UnitOfMeasurement: {
                Code: $scope.options.imperial ? 'IN' : 'CM'
              },
              Length: data.commodity[i].dimensions.length,
              Width: data.commodity[i].dimensions.width,
              Height: data.commodity[i].dimensions.height
            };
          }

          if(data.commodity[i].dangerous_goods_indicator) {
            d.DangerousGoodsIndicator = data.commodity[i].dangerous_goods_indicator;
          }

          if(data.commodity[i].commodity_value) {
            d.CommodityValue = {
              CurrencyCode: data.commodity[i].commodity_value.currency_code,
              MonetaryValue: data.commodity[i].commodity_value.monetary_value,
            }
          }

          if(data.commodity[i].freight_class) {
            d.FreightClass = data.commodity[i].freight_class;
          }

          if(data.commodity[i].nmfc_commodity_code) {
            d.NMFCCommodityCode = data.commodity[i].nmfc_commodity_code;
          }

          if(data.commodity[i].nmfc_prime_code) {
            d.NMFCCommodity = {
              PrimeCode: data.commodity.nmfc_prime_code,
              SubCode: data.commodity.nmfc_sub_code
            };
          }

          //params.Shipment.Commodity.push(d);
          params.Shipment['#list'].push({Commodity: d});
        }
      } else {
        params.Shipment.Commodity = {
          CommodityID: data.commodity.id,
          Description: data.commodity.description,
          Weight: {
            Value: data.commodity.weight,
            UnitOfMeasurement: {
              Code: $scope.options.imperial ? 'LBS' : 'KGS'
            }
          },
          NumberOfPieces: data.commodity.number_of_pieces,
          PackagingType: {
            Code: data.commodity.packaging_type
          }
        };

        if(data.commodity.dimensions) {
          params.Shipment.Commodity.Dimensions = {
            UnitOfMeasurement: {
              Code: $scope.options.imperial ? 'IN' : 'CM'
            },
            Length: data.commodity.dimensions.length,
            Width: data.commodity.dimensions.width,
            Height: data.commodity.dimensions.height
          }
        }

        if(data.commodity.dangerous_goods_indicator) {
          params.Shipment.Commodity.DangerousGoodsIndicator = data.commodity.dangerous_goods_indicator;
        }

        if(data.commodity.commodity_value) {
          params.Shipment.Commodity.CommodityValue = {
            CurrencyCode: data.commodity.commodity_value.currency_code,
            MonetaryValue: data.commodity.commodity_value.monetary_value,
          }
        }
        if(data.commodity.freight_class) {
          params.Shipment.Commodity.FreightClass = data.commodity.freight_class;
        }

        if(data.commodity.nmfc_commodity_code) {
          params.Shipment.Commodity.NMFCCommodityCode = data.commodity.nmfc_commodity_code;
        }

        if(data.commodity.nmfc_prime_code) {
          params.Shipment.Commodity.NMFCCommodity = {
            PrimeCode: data.commodity.nmfc_prime_code,
            SubCode: data.commodity.nmfc_sub_code
          };
        }
      }

      if(data.shipment_total_weight) {
        params.Shipment.ShipmentTotalWeight = {
          Value: data.shipment_total_weight,
          UnitOfMeasurement: {
            Code: $scope.options.imperial ? 'LBS' : 'KGS'
          }
        };
      }

      if(data.reference) {
        params.Shipment.Reference = {
          Number: data.reference.number ? {
            Code: data.reference.number.code | 'OTHER',
            Value: data.reference.number.value
          } : undefined,
          BarCodeIndicator: data.reference.bar_code_indicator,
          NumberOfCartons: data.reference.number_of_cartons,
          Weight: data.reference.weight ? {
            Value: data.reference.weight,
            UnitOfMeasurement: {
              Code: $scope.options.imperial ? 'LBS' : 'KGS'
            }
          } : undefined
        }
      }

      /*
      client.ProcessShipment(params, function(err, result) {
        if($scope.options.debug) {
          console.log(client.lastRequest);
          console.log(util.inspect(parser.toJson(client.lastRequest, {coerce: false, object: true, sanitize: false}), {depth: null}));
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
      */

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      params = cleanBuildParams(params);

    var header = '<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:error="http://www.ups.com/XMLSchema/XOLTWS/Error/v1.1" xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0" xmlns:tns="http://www.ups.com/WSDL/XOLTWS/FreightShip/v1.0">';
      header += '<soap:Header><upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity></soap:Header>';
      var body_request = builder.create('Request', {headless: true});
      var body_shipment = builder.create('Shipment', {headless: true});

      var body = header + '<soap:Body><FreightShipRequest xmlns="http://www.ups.com/XMLSchema/XOLTWS/FreightShip/v1.0">' + body_request.att('xmlns', 'http://www.ups.com/XMLSchema/XOLTWS/Common/v1.0').ele(params.Request).end();
      body += body_shipment.ele(params.Shipment).end();
      body += '</FreightShipRequest></soap:Body></soap:Envelope>';

      doRequest({host: hosts[$scope.options.environment],
        path: resource.p,
        method: 'POST',
        headers: {
          'Content-Length': body.length,
          'Content-Type': 'text/xml',
          'User-Agent': $scope.options.user_agent
        },
        filter: function(result) {
          return result.replace(/<(\/?)([^:>\s]*:)?([^>]+)>/g, "<$1$3>");
        }
      }, body, function(err, result) {
        if(err) {
          return callback(err, null);
        }

        if(result.Envelope.Body.Fault) {
          return callback(result.Envelope.Body.Fault.detail, null);
        }

        //console.log(util.inspect(result, {depth: null}));
        //result = fixNSData(result);

        callback(null, result);
      });
    //});


  };

  function cleanBuildParams(params) {
    if(typeof params !== 'object') {
      return params;
    }

    var i;
    if(params instanceof Array) {
      for(i = 0; i < params.length; i++) {
        if(typeof params[i] === 'undefined' || params[i] === null) {
          params.splice(i, 1);
          continue;
        }

        params[i] = cleanBuildParams(params[i]);
      }

      return params;
    }

    for(i in params) {
      if(typeof params[i] === 'undefined' || params[i] === null) {
        delete params[i];
        continue;
      }

      params[i] = cleanBuildParams(params[i]);
    }

    return params;
  };

  function fixNSData(data) {
    if(typeof data !== 'object') {
      return data;
    }

    var i;
    if(data instanceof Array) {
      for(i = 0; i < data.length; i++) {
        data[i] = fixNSData(data[i]);
      }

      return data;
    }

    for(i in data) {
      var newData = fixNSData(data[i]);
      if(i.indexOf(':')) {
        var fixedKey = i.split(':').slice(-1);
        data[fixedKey] = newData;
        delete data[i];
      } else {
        data[i] = newData;
      }
    }

    return data;
  }

  $scope.handleFreightShipResponse = function(data, callback) {
    console.log(util.inspect(data, {depth: null}));
    var fspData = data.Envelope.Body.FreightShipResponse;
    if(fspData.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, fspData);
  };

  $scope.buildFreightPickupRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'freight_pickup', 'FreightPickup.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        ShipFrom: {
          Name: data.ship_from.name,
          Address: {
            AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
            City: data.ship_from.address.city,
            StateProvinceCode: data.ship_from.address.state_code,
            PostalCode: data.ship_from.address.postal_code,
            CountryCode: data.ship_from.address.country_code
          }
        },
        ShipTo: {
          Name: data.ship_to.name,
          Address: {
            AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
            City: data.ship_to.address.city,
            StateProvinceCode: data.ship_to.address.state_code,
            PostalCode: data.ship_to.address.postal_code,
            CountryCode: data.ship_to.address.country_code
          }
        }
      };

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      client.ProcessFreightPickup(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });
  };

  $scope.handleFreightPickupResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  $scope.buildCancelFreightPickupRequest = function(data, options, resource, callback) {
    soap.createClient(path.join(__dirname,  'wsdl', 'freight_pickup', 'FreightPickup.wsdl'), {endpoint: 'https://' + hosts[$scope.options.environment] + resource.p}, function(err, client) {
      if(err) {
        return callback(err, null);
      }

      client.addSoapHeader('<upss:UPSSecurity xmlns:upss="http://www.ups.com/XMLSchema/XOLTWS/UPSS/v1.0"><upss:UsernameToken><upss:Username>' + $scope.options.username + '</upss:Username><upss:Password>' + $scope.options.password + '</upss:Password></upss:UsernameToken><upss:ServiceAccessToken><upss:AccessLicenseNumber>' + $scope.options.access_key + '</upss:AccessLicenseNumber></upss:ServiceAccessToken></upss:UPSSecurity>');


      var params = {
        Request: {
          RequestOption: data.request_option || 1,
          TransactionReference: {
            CustomerContext: data.customer_context
          }
        },
        ShipFrom: {
          Name: data.ship_from.name,
          Address: {
            AddressLine: [data.ship_from.address.address_line_1, data.ship_from.address.address_line_2, data.ship_from.address.address_line_3],
            City: data.ship_from.address.city,
            StateProvinceCode: data.ship_from.address.state_code,
            PostalCode: data.ship_from.address.postal_code,
            CountryCode: data.ship_from.address.country_code
          }
        },
        ShipTo: {
          Name: data.ship_to.name,
          Address: {
            AddressLine: [data.ship_to.address.address_line_1, data.ship_to.address.address_line_2, data.ship_to.address.address_line_3],
            City: data.ship_to.address.city,
            StateProvinceCode: data.ship_to.address.state_code,
            PostalCode: data.ship_to.address.postal_code,
            CountryCode: data.ship_to.address.country_code
          }
        }
      };

      if(options && options.extra_params && typeof options.extra_params === 'object') {
        params = extend(true, params, options.extra_params);
      }

      client.ProcessFreightCancelPickup(params, function(err, result) {
        if($scope.options.debug) {
          parser.parseString(client.lastRequest, {explicitArray: false}, function(err, debug) {
            console.log(util.inspect(debug, {depth: null}));
          });
        }
        if(err) {
          return callback(err.root.Envelope.Body.Fault.detail.Errors, null);
        }

        callback(null, result);
      });
    });
  };

  $scope.handleCancelFreightPickupResponse = function(data, callback) {
    if(data.Response.ResponseStatus.Code !== '1') {
      return callback(data.Response.Error, null);
    }
    return callback(null, data);
  };

  var resources = {
    rates: { p: '/ups.app/xml/Rate', f: $scope.buildRatesRequest, r: $scope.handleRatesResponse },
    track: { p: '/ups.app/xml/Track', f: $scope.buildTrackingRequest, r: $scope.handleTrackingResponse },
    confirm: { p: '/ups.app/xml/ShipConfirm', f: $scope.buildShipmentConfirmRequest, r: $scope.handleShipmentConfirmResponse },
    accept: { p: '/ups.app/xml/ShipAccept', f: $scope.buildShipmentAcceptRequest, r: $scope.handleShipmentAcceptResponse },
    void: { p: '/ups.app/xml/Void', f: $scope.buildVoidShipmentRequest, r: $scope.handleVoidShipmentResponse },
    address_validation: { p: '/ups.app/xml/XAV', f: $scope.buildAddressValidationRequest, r: $scope.handleAddressValidationResponse },
    time_in_transit: { p: '/ups.app/xml/TimeInTransit', f: $scope.buildTimeInTransitRequest, r: $scope.handleTimeInTransitResponse },
    pickup: {p: '/webservices/Pickup', f: $scope.buildPickupRequest, r: $scope.handlePickupResponse, wsdl: true},
    pickup_rate: {p: '/webservices/Pickup', f: $scope.buildPickupRateRequest, r: $scope.handlePickupRateResponse, wsdl: true},
    cancel_pickup: {p: '/webservices/Pickup', f: $scope.buildCancelPickupRequest, r: $scope.handleCancelPickupResponse, wsdl: true},
    freight_pickup: {p: '/webservices/FreightPickup', f: $scope.buildFreightPickupRequest, r: $scope.handleFreightPickupResponse, wsdl: true },
    cancel_freight_pickup: {p: '/webservices/FreightPickup', f: $scope.buildCancelFreightPickupRequest, r: $scope.handleCancelFreightPickupResponse, wsdl: true },
    freight_rate: {p: '/webservices/FreightRate', f: $scope.buildFreightRateRequest, r: $scope.handleFreightRateResponse, wsdl: true},
    freight_ship: {p: '/webservices/FreightShip', f: $scope.buildFreightShipRequest, r: $scope.handleFreightShipResponse, wsdl: true}
  };

  function doBuildParams(data, options, resource) {
    var authorize = $scope.buildAccessRequest(data, options);
    var callBody = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + authorize + '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + resource.f(data, options);
    var body = callBody;
    var params = {
      host: hosts[$scope.options.environment],
      path: resource.p,
      method: 'POST',
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'text/xml',
        'User-Agent': $scope.options.user_agent
      }
    };

    return {
      body: body,
      params: params
    };
  }

  function doRequest(params, body, callback) {
    if(!callback) {
      callback = body;
      body = null;
    }

    if($scope.options.debug) {
      console.log(body);
      console.log('Request: ');
      console.log(params);
    }

    var req = https.request(params);

    req.write(body);
    req.on('error', function(e) {
      return callback(e, null);
    });
    req.on('response', function(res) {
      var responseData = '';

      res.on('data', function(data) {
        responseData += data.toString();
      });

      res.on('end', function() {
        if(params.filter && typeof params.filter === 'function') {
          responseData = params.filter(responseData);
        }

        parser.parseString(responseData, {explicitArray: false}, callback);
      });
    });
    req.end();
  }

  function buildResourceFunction(i, resources) {
    if(i === 'rates') {
      return function(data, options, callback) {
        if(!callback) {
          callback = options;
          options = undefined;
        }

        if(data.services && data.services.length > 0) {
          var responses = [];
          for(var j = 0; j < data.services.length; j++) {
            var newData = Object.create(data);
            delete newData.services;
            newData.service = data.services[j];

            var opts = doBuildParams(newData, options, resources[i]);
            doRequest(opts.params, opts.body, function(err, res) {
              if(err) {
                responses.push(err);
              } else {
                responses.push(res);
              }

              if(responses.length === data.services.length) {
                return resources[i].r(responses, callback);
              }
            });
          }
          return;
        }

        var opts = doBuildParams(data, options, resources[i]);

        doRequest(opts.params, opts.body, function(err, res) {
          if(err) {
            return callback(err, null);
          }
          return resources[i].r(res, callback)
        });
      }
    } else if(resources[i].wsdl === true) {
      return function(data, options, callback) {
        if(!callback) {
          callback = options;
          options = undefined;
        }

        resources[i].f(data, options, resources[i], function(err, res) {
          if(err) {
            return callback(err, null);
          }
          resources[i].r(res, callback);
        });
      }
    } else {
      return function(data, options, callback) {
        if(!callback) {
          callback = options;
          options = undefined;
        }

        var opts = doBuildParams(data, options, resources[i]);

        doRequest(opts.params, opts.body, function(err, res) {
          if(err) {
            return callback(err, null);
          }
          return resources[i].r(res, callback)
        });
      }
    }
  }

  for(var i in resources) {
    $scope[i] = buildResourceFunction(i, resources);
  }

  return $scope.config(args);
}

module.exports = UPS;
