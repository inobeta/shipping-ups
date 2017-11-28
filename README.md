#shipping-ups

## Install

`npm install shipping-ups`

## Usage

```js
  var upsAPI = require('shipping-ups');

  var ups = new upsAPI({
    environment: 'sandbox', // or live
    username: 'UPSUSERNAME',
    password: 'UPSPASSWORD',
    access_key: 'UPSACCESSTOKEN',
    imperial: true // set to false for metric
  });

  var realWeight = ups.dimensionalWeight(weight, length, width, height);

  ups.time_in_transit(..., function(err, res) {
    ...
  });

  ups.address_validation(..., function(err, result) {
    ...
  });

  ups.track(..., function(err, result) {
    ...
  });

  ups.rates(..., function(err, result) {
    ...
  });

  // Generate a Digest for a specific Rate
  ups.confirm(..., function(err, result) {
    ...
  });

  // Purchase the Label
  ups.accept(..., function(err, result) {
    ...
  });

  // Pickup Request
  ups.pickup(..., function(err, result) {

  });

  // Pickup Rate Request
  ups.pickup_rate(..., function(err, result) {

  });

  // Pickup Cancel Request
  ups.cancel_pickup(..., function(err, result) {

  });

  // Void the Shipment
  ups.void(..., function(err, result) {
    ...
  });
```

### Freight Methods

```js
  ups.freight_rate(..., function(err, res) {
    ...
  });

  ups.freight_ship(..., function(err, res) {
    ...
  });

  ups.freight_pickup(..., function(err, res) {
    ...
  });

  ups.cancel_freight_pickup(..., function(err, res) {
    ...
  });
```

### new upsAPI(options)

Initialize your API bindings

```js
  options = {
    imperial: true, // for inches/lbs, false for metric cm/kgs
    currency: 'USD',
    environment: 'sandbox',
    access_key: '',
    username: '',
    password: '',
    pretty: false,
    user_agent: 'uh-sem-blee, Co | typefoo',
    debug: false
  }
```

### dimensionalWeight(weight, length, width, height)

Returns the real weight needing to be used for your package.

`weight` The tare weight of your product

`length` The longest side of your package

`width` The width of your package

`height` The height of your package

### density(weight, length, width, height)

Get the density of a package to be used for calculating freight class

`weight` The tare weight of your product

`length` The longest side of your package

`width` The width of your package

`height` The height of your package

### Optional Options

All request below can have the following optional options passed in an object:

`transaction_id` A reference number you can pass to the transaction. Is returned as TransactionReference.CustomerContext

`extra_params` This object extends the request object that is passed to the XML parser. Use with caution, but can enable extended functionality not present in the current module.

`use_ounces` This boolean option will allow you to substitute OZS instead of LBS or KGS in your request (Useful for rates that require less than a pound)

### time_in_transit(data, [options,] callback)

Calculate the time in transit for a shipment

```js
  data = {
    from: {
      city: 'Dover',
      state_code: 'OH',
      postal_code: '44622',
      country_code: 'US'
    },
    to: {
      city: 'Charlotte',
      state_code: 'NC',
      postal_code: '28205',
      country_code: 'US'
    },
    weight: 10, // set imperial to false for KGS
    pickup_date: 'YYYYMMDD',
    total_packages: 1, // number of packages in shipment
    value: 999999999.99, // Invoice value, set currency in options
  }
```

### address_validation(data, [options,] callback)

Validates an address

```js
  data = {
    request_option: 3, // 1, 2, or 3 per UPS docs
    // 1 - Address Validation
    // 2 - Address Classification
    // 3 - Address Validation and Address Classification.
    name: 'Customer Name',
    company: 'Company Name',
    address_line_1: 'Address Line 1',
    address_line_2: 'Address Line 2',
    address_line_3: 'Address Line 3',
    city: 'Dover',
    state_code: 'OH',
    postal_code: '44622',
    country_code: 'US'
  }
```

### track(tracking_number, [options,] callback)

Get a shipment's tracking information with `tracking_number` as the ID

```js
  options = {
    latest: true // default false, will get only the latest tracking info, otherwise retrieves history
  }
```

### rates(data, [options,] callback)

Get a list of shipping rates

```js
  data = {
    pickup_type: 'daily_pickup', // optional, can be: 'daily_pickup', 'customer_counter', 'one_time_pickup', 'on_call_air', 'suggested_retail_rates', 'letter_center', 'air_service_center'
    pickup_type_code: '02', // optional, overwrites pickup_type
    customer_classification: '00', // optional, need more details about what this does
    shipper: {
      name: 'Type Foo',
      shipper_number: 'SHIPPER_NUMBER', // optional, but recommended for accurate rating
      phone_number: '', // optional
      fax_number: '', // optional
      email_address: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    ship_to: {
      company_name: 'Company Name', // or person's name
      attention_name: '', // optional
      phone_number: '', // optional
      fax_number: '', // optional
      email_address: '', // optional
      tax_identification_number: '', // optional
      location_id: '', //optional, for specific locations
      address: {
        address_line_1: '3456 Fake Address', // optional
        city: 'Charlotte', // optional
        state_code: 'NC', // optional, required for negotiated rates
        country_code: 'US',
        postal_code: '28205',
        residential: true // optional, can be useful for accurate rating
      }
    },
    ship_from: { // optional, use if different from shipper address
      company_name: 'Company Name', // or person's name
      attention_name: 'Attention Name',
      phone_number: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    sold_to: { // optional, The person or company who imports and pays any duties due on the current shipment, required if Invoice of NAFTA CO is requested
      option: '01', // optional, applies to NAFTA CO form
      company_name: 'Company Name', // or person's name
      attention_name: 'Attention Name',
      phone_number: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    service: '03' // optional, will rate this specific service.
    services: [ // optional, you can specify which rates to look for -- performs multiple requests, so be careful not to do too many
      '03'
    ],
    return_service: '9', // optional, will provide a UPS Return Service specification
    packages: [
      {
        packaging_type: '02', // optional, packaging type code
        weight: 10,
        description: 'My Package', // optional
        delivery_confirmation_type: 2, // optional, 1 or 2
        insured_value: 1000.00, // optional, 2 decimals
        dimensions: { // optional, integers: 0-108 for imperial, 0-270 for metric
          length: 12,
          width: 12,
          height: 24
        }
      }
    ]
  }

  options = {
    negotiated_rates: true // Optional, but if truthy then the NegotiatedRatesIndicator will always be placed (even without state/province code). Useful for countries without provinces.
  }
```

### confirm(data, [options,] callback)

Pick a shipping rate

```js
  data = {
    service_code: '03', // required for selected rate
    return_service: '9', // optional, will provide a UPS Return Service specification
    saturday_delivery: true, // optional, will indicate Saturday Delivery
    pickup_type: 'daily_pickup', // optional, can be: 'daily_pickup', 'customer_counter', 'one_time_pickup', 'on_call_air', 'suggested_retail_rates', 'letter_center', 'air_service_center'
    pickup_type_code: '02', // optional, overwrites pickup_type
    customer_classification: '00', // optional, need more details about what this does
    label_type: 'EPL', // optional, will default to 'GIF'
    shipper: {
      name: 'Type Foo',
      shipper_number: 'SHIPPER_NUMBER', // optional, but recommended for accurate rating
      phone_number: '', // optional
      fax_number: '', // optional
      email_address: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    ship_to: {
      company_name: 'Company Name', // or person's name
      attention_name: '', // optional
      phone_number: '', // optional
      fax_number: '', // optional
      email_address: '', // optional
      tax_identification_number: '', // optional
      location_id: '', //optional, for specific locations
      address: {
        address_line_1: '3456 Fake Address', // optional
        city: 'Charlotte', // optional
        state_code: 'NC', // optional, required for negotiated rates
        country_code: 'US',
        postal_code: '28205',
        residential: true // optional, can be useful for accurate rating
      }
    },
    ship_from: { // optional, use if different from shipper address
      company_name: 'Company Name', // or person's name
      attention_name: 'Attention Name',
      phone_number: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    sold_to: { // optional, The person or company who imports and pays any duties due on the current shipment, required if Invoice of NAFTA CO is requested
      option: '01', // optional, applies to NAFTA CO form
      company_name: 'Company Name', // or person's name
      attention_name: 'Attention Name',
      phone_number: '', // optional
      tax_identification_number: '', // optional
      address: {
        address_line_1: '123 Fake Address',
        city: 'Dover',
        state_code: 'OH',
        country_code: 'US',
        postal_code: '44622'
      }
    },
    packages: [ // at least one package is required
      {
        packaging_type: '02', // optional, packaging type code
        weight: 10,
        description: 'My Package', // optional
        delivery_confirmation_type: 2, // optional, 1 or 2
        insured_value: 1000.00, // optional, 2 decimals
        dimensions: { // optional, integers: 0-108 for imperial, 0-270 for metric
          length: 12,
          width: 12,
          height: 24
        },
        reference_number: 'ABC123' // optional
        reference_number: { // optional, object format code/value keypair
          code: 'PM',
          value: 'ABC123'
        },
        reference_number: [ // optional, array format, can be strings or objects in code/value keypair format
          'ABC123',
          'WWWABC123'
        ]
      }
    ]
  }

  options = {
    negotiated_rates: true // See rates options.
  }
```

### accept(shipment_digest, [options,] callback)

Purchase a shipping label and tracking number

```js
  shipment_digest = 'SHIPMENTDIGEST'; // big data string
```

### pickup(pickup_creation_data, callback)

```js
  ups.pickup({
    rate_pickup_indicator: 'Y',
    shipper_account: 'ABC123',
    pickup_date: '20141223',
    eariest_time_ready: '0800',
    latest_time_ready: '1200',
    pickup_address: {
      company_name: 'Pat Stewart',
      contact_name: 'Pat Stewart',
      address_line_1: '2311 York Road',
      city: 'Timonium',
      state_code: 'MD',
      postal_code: '21093',
      country_code: 'US',
      phone_number: '5555555555'
    },
    weight: 5.5,
    pickup_piece: [
      {
        service_code: '003',
        quantity: 1,
        container_code: '01'
      }
    ],
    payment_method: '01'
  }, function(err, res) {
    if(err) {
      return console.log(util.inspect(err, {depth: null}));
    }

    console.log(util.inspect(res, {depth: null}));
  });
```

### pickup_rate(pickup_rate_data, callback)

TBD

### cancel_pickup(pickup_cancel_data, callback)

TBD

### void(data, [options,] callback)

```js
  data = '1ZTRACKINGNUMBER';
```

OR

```js
  data = {
    shipment_identification_number: '1ZSHIPMENTIDNUMBER',
    tracking_numbers: ['1ZTRACKINGNUMBER', '1ZTRACKINGNUMBER'] // optional
  }
```

Void a previously created order

### freight_rate(data, [options,] callback)

Call the Freight Rating API

These are example fields which cover the basic required fields. More should be added to cover all the features of the api.

```js
  ups.freight_rate({
    ship_from: {
      name: 'Test My Company',
      address: {
        address_line_1: '1234 Test Name Rd',
        city: 'Charlotte',
        state_code: 'NC',
        postal_code: '28262',
        country_code: 'US'
      }
    },
    ship_to: {
      name: 'John Doe',
      address: {
        address_line_1: '4567 Another Road Ct',
        city: 'Dover',
        state_code: 'OH',
        postal_code: '44622',
        country_code: 'US'
      }
    },
    payer: {
      name: 'Ron Rosef',
      address: {
        address_line_1: '867 Five Three Oh Nine',
        city: 'Charlotte',
        state_code: 'NC',
        postal_code: '28262',
        country_code: 'US'
      },
      shipper_number: 'ABC123'
    },
    billing_option: '10',
    service_code: '308',
    handling_unit_one: {
      quantity: '20',
      code: 'PLT'
    },
    commodity: {
      description: 'A huge bag of something',
      weight: '750',
      number_of_pieces: '45',
      packaging_type: 'BAG',
      freight_class: '60'
    }
  }, function(err, res) {
    if(err) {
      return console.log(err);
    }

    console.log(util.inspect(res, {depth: null}));
  });
```

### freight_ship(data, [options,] callback)

```js
  ups.freight_ship({
    request_option: 1, // optional, 1 for ground, 2 for air
    customer_context: 'Add description', // optional
    shipment_shipper_number: '222006',
    ship_from: {
      name: 'Pat Stewart',
      address: {
        address_line_1: '2311 York Road',
        city: 'Timonium',
        state_code: 'MD',
        postal_code: '21093',
        country_code: 'US'
      },
      attention_name: 'String',
      phone_number: '5555555555',
      tax_identification_number: '1234567890'
    },
    ship_to: {
      name: 'Consignee Test 1',
      address: {
        address_line_1: '2010 Warsaw Road',
        city: 'Roswell',
        state_code: 'GA',
        postal_code: '30076',
        country_code: 'US'
      },
      attention_name: 'String',
      phone_number: '5555554444',
      email_address: 'test2@test.com'
    },
    payer: {
      name: 'Superman',
      address: {
        address_line_1: '2010 Warsaw Road',
        city: 'Roswell',
        state_code: 'GA',
        postal_code: '30076',
        country_code: 'US'
      },
      shipper_number: '00613270'
    },
    billing_option: '10',
    service_code: '308',
    handling_unit_one: {
      quantity: '16',
      code: 'PLT'
    },
    commodity: {
      id: '22',
      description: 'BUGS',
      weight: '511.25',
      number_of_pieces: '1',
      packaging_type: 'PLT',
      freight_class: '60',
      nmfc_commodity_code: '566',
      dimensions: {
        length: 1.25,
        width: 1.2,
        height: 5
      }
      //nmfc_prime_code: '116030',
      //nmfc_sub_code: '1'
    }
  }, function(err, res) {
    if(err) {
      return console.log(util.inspect(err, {depth: null}));
    }

    console.log(util.inspect(res, {depth: null}));
  });
```

### freight_pickup(data, [options,] callback)

TBD

### cancel_freight_pickup(data, [options,] callback)

TBD

See `example/index.js` for a working sample.

## License

(The MIT License)

Copyright 2014 uh-sem-blee, Co. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
