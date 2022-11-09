# Bug reproduction in OTEL awsemf exporter

The `awsemf` exporter of the ADOT distribution of OTEL sends faulty data for the first batch of metrics send to AWS Cloudwatch.

## Steps to reproduce
1. Authenticate your shell against an AWS account with the `default` profile. (Or change the value of the `AWS_PROFILE` env var in step 3)
2. create the log group `emfbug-reproduction-embedded-metrics-otel` by running `aws logs create-log-group --log-group-name emfbug-reproduction-embedded-metrics-otel`
3. Start the otel agent by running  
`docker run -d --rm -p 4317:4317 \
-e AWS_REGION=eu-central-1 \
-e AWS_PROFILE=default \
-v ~/.aws:/root/.aws \
-v "$(pwd)/otel-agent-config.yaml":/otel-local-config.yaml \
--name awscollector \
public.ecr.aws/aws-observability/aws-otel-collector:latest \
--config otel-local-config.yaml;`
4. run `yarn install`
5. create metrics by running `yarn start`
   1. In [the code](./src/index.ts) we create a new OTEL counter. We add `1` to the counter four times in total. We Split these four increments on two batches with two increments each. Between these batches there is a wait time to allow the OTEL agent to flush the values to AWS.
6. Run this [log insights query](https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#logsV2:logs-insights$3FqueryDetail$3D$257E$2528end$257E0$257Estart$257E-1800$257EtimeType$257E$2527RELATIVE$257Eunit$257E$2527seconds$257EeditorString$257E$2527fields*20counter_name*2c*40timestamp$257EisLiveTail$257Efalse$257EqueryId$257E$2527293e02d9-1cfc-446f-bb07-174daa3d4833$257Esource$257E$2528$257E$2527emfbug-reproduction-embedded-metrics-otel$2529$2529) (`fields counter_name,@timestamp` on the log group `emfbug-reproduction-embedded-metrics-otel` ) to see the published EMF Metrics.
   1. See actual and expected result 
7. Cleanup by running `docker rm -f awscollector` and `aws logs delete-log-group --log-group-name emfbug-reproduction-embedded-metrics-otel` 

## Expected Result
We expect the loggroup to contain two entries with a value of `2`. One entry for each batch.

## Actual result
We only get one entry with a value of `2`. The first batch gets its value set to `0`. 

### Additional information
* The behaviour persists over multiple runs of the script. 
* Also does it happen for each new combination of counter name, and attributes. 
* In Order to exclude a faulty implementation in the OTEL Framework we also added a `ConsoleMetricExporter` alongside the one that exports the metrics to the OTEL agent. This Exporter print the correct values to the console.
* In addition we added a `file` exporter to the OTEL agent pipeline. This one also shows the correct values.
* Small waits between the batches lead to all four increments ending up in the same batch and we se no value in cloudwatch whatsoever.