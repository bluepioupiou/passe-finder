<div class="wide form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'action'=>Yii::app()->createUrl($this->route),
	'method'=>'get',
)); ?>

	<div class="row">
		<?php echo $form->label($model,'id'); ?>
		<?php echo $form->textField($model,'id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'name'); ?>
		<?php echo $form->textField($model,'name',array('size'=>45,'maxlength'=>45)); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'description'); ?>
		<?php echo $form->textField($model,'description',array('size'=>60,'maxlength'=>250)); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'enchainement_id'); ?>
		<?php echo $form->textField($model,'enchainement_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'dateCreate'); ?>
		<?php echo $form->textField($model,'dateCreate'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'dateMaj'); ?>
		<?php echo $form->textField($model,'dateMaj'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'youtube_url'); ?>
		<?php echo $form->textField($model,'youtube_url',array('size'=>60,'maxlength'=>250)); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton('Search'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- search-form -->