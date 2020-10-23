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
		<?php echo $form->textField($model,'name',array('size'=>50,'maxlength'=>50)); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'positionStart_id'); ?>
		<?php echo $form->textField($model,'positionStart_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'positionEnd_id'); ?>
		<?php echo $form->textField($model,'positionEnd_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'difficulty'); ?>
		<?php echo $form->textField($model,'difficulty'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'description'); ?>
		<?php echo $form->textArea($model,'description',array('rows'=>6, 'cols'=>50)); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'progress'); ?>
		<?php echo $form->textArea($model,'progress',array('rows'=>6, 'cols'=>50)); ?>
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
		<?php echo $form->label($model,'danse_id'); ?>
		<?php echo $form->textField($model,'danse_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->label($model,'userCreate_id'); ?>
		<?php echo $form->textField($model,'userCreate_id'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton('Search'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- search-form -->