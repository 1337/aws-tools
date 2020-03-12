# aws-tools

```shell script
aws-tools ec2 log-files \
    --profile default \
    --region us-east-1 \
    --tag default-web \
    --log-file /var/log/apache/access.log

aws-tools rds slowest-queries \
    --profile prod \
    --region us-east-1 \
    --instance-id \
    my-database-1
```
