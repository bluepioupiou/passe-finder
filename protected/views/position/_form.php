<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'position-form',
	'enableAjaxValidation'=>false,
	'htmlOptions' => array('enctype' => 'multipart/form-data'),
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<div class="row">
		<?php echo $form->labelEx($model,'danse'); ?>
		<?php echo $form->dropDownList($model,'danse_id', CHtml::listData(Danse::model()->findAll(), 'id', 'name')); ?>
		<?php echo $form->error($model,'danse_id'); ?>
	</div>
	
	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'name'); ?>
		<?php echo $form->textField($model,'name',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'name'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'description'); ?>
		<?php echo $form->textArea($model,'description',array('rows'=>6, 'cols'=>50)); ?>
		<?php echo $form->error($model,'description'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'image'); ?>
		<?php echo $form->fileField($model,'image_file'); ?>
		<?php echo $form->error($model,'image_file'); ?>
	</div>	

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Créer' : 'Sauvegarder'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->